from datetime import timedelta
from email.utils import formataddr
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.utils import timezone
import requests

from admin_dashboard.models import NotificationEmailTemplate, NotificationEmailLog

logger = logging.getLogger(__name__)


DEFAULT_NOTIFICATION_EMAIL_TEMPLATES = {
    "new_like": {
        "name": "New Like Email",
        "subject_template": "{{ actor_name }} liked your profile on NouMatch",
        "html_template": (
            "<p>Hi {{ recipient_name }},</p>"
            "<p><strong>{{ actor_name }}</strong> liked your profile on NouMatch.</p>"
            "<p>Open your account to see who noticed you and keep the momentum going.</p>"
            "<p><a href=\"{{ cta_url }}\">Open NouMatch</a></p>"
        ),
        "text_template": (
            "Hi {{ recipient_name }},\n\n"
            "{{ actor_name }} liked your profile on NouMatch.\n"
            "Open your account here: {{ cta_url }}\n"
        ),
        "sample_payload": {
            "recipient_name": "Alicia",
            "actor_name": "Jordan",
            "cta_url": "https://noumatch.com/notifications",
        },
    },
    "new_match": {
        "name": "New Match Email",
        "subject_template": "You have a new match with {{ actor_name }}",
        "html_template": (
            "<p>Hi {{ recipient_name }},</p>"
            "<p>You and <strong>{{ actor_name }}</strong> matched on NouMatch.</p>"
            "<p>Say hi while the moment is fresh.</p>"
            "<p><a href=\"{{ cta_url }}\">Open your messages</a></p>"
        ),
        "text_template": (
            "Hi {{ recipient_name }},\n\n"
            "You matched with {{ actor_name }} on NouMatch.\n"
            "Open your messages: {{ cta_url }}\n"
        ),
        "sample_payload": {
            "recipient_name": "Alicia",
            "actor_name": "Jordan",
            "cta_url": "https://noumatch.com/messages",
        },
    },
    "new_message": {
        "name": "New Message Email",
        "subject_template": "{{ actor_name }} sent you a message on NouMatch",
        "html_template": (
            "<p>Hi {{ recipient_name }},</p>"
            "<p><strong>{{ actor_name }}</strong> sent you a new message.</p>"
            "<p>Preview: {{ message_preview }}</p>"
            "<p><a href=\"{{ cta_url }}\">Reply now</a></p>"
        ),
        "text_template": (
            "Hi {{ recipient_name }},\n\n"
            "{{ actor_name }} sent you a new message.\n"
            "Preview: {{ message_preview }}\n"
            "Reply now: {{ cta_url }}\n"
        ),
        "sample_payload": {
            "recipient_name": "Alicia",
            "actor_name": "Jordan",
            "message_preview": "Hey, are you free later this week?",
            "cta_url": "https://noumatch.com/messages",
        },
    },
}


def ensure_notification_email_templates():
    templates = []
    for event_type, defaults in DEFAULT_NOTIFICATION_EMAIL_TEMPLATES.items():
        template, _ = NotificationEmailTemplate.objects.get_or_create(
            event_type=event_type,
            defaults=defaults,
        )
        templates.append(template)
    return templates


def _frontend_url(path):
    base = getattr(settings, "FRONTEND_URL", "https://noumatch.com").rstrip("/")
    if not path:
        return base
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{base}{path}"


def _default_text_from_html(html):
    return (
        html.replace("<br/>", "\n")
        .replace("</p>", "\n\n")
        .replace("<p>", "")
        .replace("<strong>", "")
        .replace("</strong>", "")
        .replace("<a href=\"", "")
        .replace("\">", ": ")
        .replace("</a>", "")
    )


def _sender_email_address():
    return settings.DEFAULT_FROM_EMAIL.split("<")[-1].replace(">", "").strip()


def _send_via_brevo(subject, html_body, text_body, recipient_email, recipient_name, from_name, reply_to):
    api_key = getattr(settings, "BREVO_API_KEY", "")
    if not api_key:
        raise RuntimeError("BREVO_API_KEY is not configured")

    payload = {
        "sender": {"name": from_name or "NouMatch", "email": _sender_email_address()},
        "to": [{"email": recipient_email, "name": recipient_name or recipient_email.split("@")[0]}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body,
    }
    if reply_to:
        payload["replyTo"] = {"email": reply_to[0]}

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }
    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        json=payload,
        headers=headers,
        timeout=15,
    )
    response_payload = {}
    try:
        response_payload = response.json()
    except Exception:
        response_payload = {"raw": response.text[:500]}

    if response.status_code != 201:
        message = response_payload.get("message") or response.text or f"Brevo send failed with status {response.status_code}"
        raise RuntimeError(message)

    return {
        "provider": "brevo_api",
        "message_id": response_payload.get("messageId") or response_payload.get("message_id") or "",
        "response": response_payload,
    }


def _create_log(template, recipient, recipient_email, event_type, subject, html_body, text_body, status, metadata, related_object=None, error_message=""):
    return NotificationEmailLog.objects.create(
        recipient=recipient,
        recipient_email=recipient_email,
        event_type=event_type,
        template_version=template.version if template else 0,
        status=status,
        subject_rendered=subject,
        html_rendered=html_body,
        text_rendered=text_body,
        metadata=metadata or {},
        related_object_type=related_object.__class__.__name__ if related_object else "",
        related_object_id=getattr(related_object, "id", None) if related_object else None,
        error_message=error_message,
    )


def _send_notification_email_with_template(template, event_type, recipient=None, recipient_email=None, context_data=None, *, related_object=None, metadata=None):
    if not recipient and not recipient_email:
        raise ValueError("recipient or recipient_email is required")

    resolved_email = recipient_email or recipient.email
    context = {
        "recipient_name": (
            (recipient.first_name or recipient.email.split("@")[0])
            if recipient else resolved_email.split("@")[0]
        ),
        **(context_data or {}),
    }

    if not template or not template.is_enabled:
        return _create_log(
            template,
            recipient,
            resolved_email,
            event_type,
            "",
            "",
            "",
            "skipped",
            metadata,
            related_object=related_object,
            error_message="Template missing or disabled.",
        )

    if event_type == "new_message":
        conversation_id = (metadata or {}).get("conversation_id")
        cooldown_minutes = int(getattr(settings, "NOTIFICATION_EMAIL_MESSAGE_COOLDOWN_MINUTES", 15) or 15)
        cooldown_start = timezone.now() - timedelta(minutes=cooldown_minutes)
        recent_log_exists = NotificationEmailLog.objects.filter(
            recipient=recipient,
            event_type=event_type,
            related_object_id=conversation_id,
            status="sent",
            created_at__gte=cooldown_start,
        ).exists()
        if recent_log_exists:
            return _create_log(
                template,
                recipient,
                resolved_email,
                event_type,
                "",
                "",
                "",
                "skipped",
                metadata,
                related_object=related_object,
                error_message=f"Skipped due to {cooldown_minutes}-minute conversation cooldown.",
            )

    subject = template.render_subject(context)
    html_body = template.render_html(context)
    text_body = template.render_text(context) or _default_text_from_html(html_body)

    log = _create_log(
        template,
        recipient,
        resolved_email,
        event_type,
        subject,
        html_body,
        text_body,
        "pending",
        metadata,
        related_object=related_object,
    )

    from_email = formataddr((template.from_name or "NouMatch", _sender_email_address()))
    reply_to = [template.reply_to] if template.reply_to else None
    recipient_name = context.get("recipient_name") or resolved_email.split("@")[0]

    try:
        provider_info = None
        if getattr(settings, "BREVO_API_KEY", ""):
            provider_info = _send_via_brevo(
                subject,
                html_body,
                text_body,
                resolved_email,
                recipient_name,
                template.from_name,
                reply_to,
            )
        else:
            message = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=from_email,
                to=[resolved_email],
                reply_to=reply_to,
            )
            if html_body:
                message.attach_alternative(html_body, "text/html")
            message.send(fail_silently=False)
            provider_info = {"provider": "django_smtp", "message_id": "", "response": {}}

        log.status = "sent"
        log.sent_at = timezone.now()
        log.provider_message_id = provider_info.get("message_id", "")
        log.provider_response = provider_info.get("response", {})
        log.save(update_fields=["status", "sent_at", "provider_message_id", "provider_response"])
    except Exception as exc:
        logger.exception("Notification email send failed for %s -> %s", event_type, resolved_email)
        log.status = "failed"
        log.error_message = str(exc)
        log.retry_count += 1
        log.save(update_fields=["status", "error_message", "retry_count"])

    return log


def send_event_notification_email(event_type, recipient, context_data, *, related_object=None, metadata=None):
    ensure_notification_email_templates()
    template = NotificationEmailTemplate.objects.filter(event_type=event_type).first()
    return _send_notification_email_with_template(
        template,
        event_type,
        recipient=recipient,
        context_data=context_data,
        related_object=related_object,
        metadata=metadata,
    )


def send_test_notification_email(event_type, recipient_email, context_data, *, template_overrides=None, metadata=None):
    ensure_notification_email_templates()
    base_template = NotificationEmailTemplate.objects.filter(event_type=event_type).first()
    if not base_template:
        raise ValueError(f"No template found for {event_type}")

    working_template = base_template
    if template_overrides:
        working_template = NotificationEmailTemplate(
            event_type=event_type,
            name=template_overrides.get("name") or base_template.name,
            is_enabled=template_overrides.get("is_enabled", base_template.is_enabled),
            subject_template=template_overrides.get("subject_template") or base_template.subject_template,
            html_template=template_overrides.get("html_template") or base_template.html_template,
            text_template=template_overrides.get("text_template") or base_template.text_template,
            sample_payload=template_overrides.get("sample_payload") or base_template.sample_payload,
            from_name=template_overrides.get("from_name") or base_template.from_name,
            reply_to=template_overrides.get("reply_to") or base_template.reply_to,
            version=base_template.version,
        )

    return _send_notification_email_with_template(
        working_template,
        event_type,
        recipient=None,
        recipient_email=recipient_email,
        context_data=context_data,
        metadata={
            **(metadata or {}),
            "manual_test": True,
        },
    )


def queue_event_notification_email(event_type, recipient, context_data, *, related_object=None, metadata=None):
    transaction.on_commit(
        lambda: send_event_notification_email(
            event_type,
            recipient,
            context_data,
            related_object=related_object,
            metadata=metadata,
        )
    )

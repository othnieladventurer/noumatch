"""Django email backend that delivers through the Resend HTTP API.

Wired as EMAIL_BACKEND for non-development environments, so every
send_mail()/EmailMessage/EmailMultiAlternatives call in the project is sent
by Resend.
"""

import base64
import logging

from django.core.mail.backends.base import BaseEmailBackend

from api.resend_client import send_email

logger = logging.getLogger(__name__)


class ResendEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        sent_count = 0
        for message in email_messages:
            try:
                self._send_message(message)
            except Exception:
                if not self.fail_silently:
                    raise
                logger.exception(
                    "Resend delivery failed for %s", getattr(message, "subject", "")
                )
            else:
                sent_count += 1

        return sent_count

    def _send_message(self, message):
        html_body = ""
        for content, mimetype in getattr(message, "alternatives", None) or []:
            if mimetype == "text/html":
                html_body = content
                break

        send_email(
            to=list(message.to or []),
            subject=message.subject or "",
            html=html_body,
            text=message.body or "",
            from_email=message.from_email or None,
            reply_to=list(getattr(message, "reply_to", None) or []),
            attachments=self._encode_attachments(message),
        )

    @staticmethod
    def _encode_attachments(message):
        encoded = []
        for attachment in getattr(message, "attachments", None) or []:
            try:
                filename, content, mimetype = attachment
            except (TypeError, ValueError):
                logger.warning(
                    "Skipping unsupported attachment on %s", getattr(message, "subject", "")
                )
                continue

            raw = content.encode("utf-8") if isinstance(content, str) else bytes(content)
            item = {"filename": filename, "content": base64.b64encode(raw).decode("ascii")}
            if mimetype:
                item["content_type"] = mimetype
            encoded.append(item)

        return encoded

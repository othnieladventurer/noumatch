import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.contenttypes.models import ContentType
from django.db import transaction, IntegrityError
from django.conf import settings

from .models import Notification
from .serializers import NotificationSerializer
from interactions.models import Like
from admin_dashboard.services.email_notifications import queue_event_notification_email

logger = logging.getLogger(__name__)


def send_web_push(user, title, body, url='/'):
    """Send a Web Push notification to all of user's registered browser endpoints."""
    vapid_private = getattr(settings, 'VAPID_PRIVATE_KEY', '')
    vapid_claims_email = getattr(settings, 'VAPID_CLAIMS_EMAIL', 'mailto:admin@noumatch.com')
    if not vapid_private:
        return

    try:
        from pywebpush import webpush, WebPushException
        from .models import PushSubscription
        import json

        subs = PushSubscription.objects.filter(user=user)
        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        'endpoint': sub.endpoint,
                        'keys': {'p256dh': sub.p256dh, 'auth': sub.auth},
                    },
                    data=json.dumps({'title': title, 'body': body, 'url': url}),
                    vapid_private_key=vapid_private,
                    vapid_claims={'sub': vapid_claims_email},
                )
            except WebPushException as e:
                if e.response and e.response.status_code in (404, 410):
                    sub.delete()
                else:
                    logger.warning("Web push failed for sub %s: %s", sub.id, e)
    except ImportError:
        logger.warning("pywebpush not installed — skipping web push")
    except Exception:
        logger.exception("send_web_push error for user %s", user.id)


def send_realtime_notification(user, notification):
    try:
        channel_layer = get_channel_layer()
        group_name = f'notifications_{user.id}'
        serializer = NotificationSerializer(notification)
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'send_notification',
                'notification': serializer.data,
            },
        )
    except Exception:
        logger.warning("Realtime notification failed for user %s", user.id)


def send_like_notification(like):
    """
    Creates a like notification using the UniqueConstraint key (recipient, type, object_id).
    Transaction-locked to prevent duplicate sends.
    """
    try:
        with transaction.atomic():
            locked_like = Like.objects.select_for_update().get(pk=like.pk)
            if locked_like.notification_sent:
                return None

            from_user = locked_like.from_user
            to_user = locked_like.to_user
            like_ct = ContentType.objects.get_for_model(Like)

            # Lookup matches UniqueConstraint: (recipient, type, object_id)
            notification, created = Notification.objects.get_or_create(
                recipient=to_user,
                type='new_like',
                object_id=locked_like.id,
                defaults={
                    'content_type': like_ct,
                    'title': f"{from_user.first_name or 'Someone'} liked your profile!",
                    'message': f"{from_user.first_name or 'Someone'} liked your profile.",
                    'link': f"/profile/{from_user.id}",
                    'link_text': 'View Profile',
                    'icon': 'heart',
                }
            )

            if created:
                Like.objects.filter(pk=locked_like.pk).update(notification_sent=True)
                send_realtime_notification(to_user, notification)
                queue_event_notification_email(
                    'new_like',
                    to_user,
                    {
                        'actor_name': from_user.first_name or from_user.email.split('@')[0],
                        'cta_url': notification.link or '/notifications',
                    },
                    related_object=locked_like,
                    metadata={
                        'notification_id': notification.id,
                        'actor_id': from_user.id,
                        'recipient_id': to_user.id,
                    },
                )
            return notification
    except Exception:
        logger.exception("send_like_notification failed for like %s", like.pk)
        return None


def send_match_notification(match, user1, user2):
    """
    Creates match notifications using get_or_create to prevent duplicates
    (e.g. from double-fired signals). Only sends realtime/push/email on first creation.
    """
    notifications = []
    try:
        match_ct = ContentType.objects.get_for_model(match)
        conversation_id = getattr(getattr(match, "conversation", None), "id", None)
        conversation_link = (
            f"/messages?conversation={conversation_id}" if conversation_id
            else f"/messages?match={match.id}"
        )

        for recipient, other in ((user1, user2), (user2, user1)):
            try:
                # Lookup key matches UniqueConstraint: (recipient, type, object_id)
                notif, created = Notification.objects.get_or_create(
                    recipient=recipient,
                    type='new_match',
                    object_id=match.id,
                    defaults={
                        'content_type': match_ct,
                        'title': "It's a Match!",
                        'message': f"You matched with {other.first_name or other.email}!",
                        'link': conversation_link,
                        'link_text': 'Say Hi',
                        'icon': 'handshake',
                    }
                )
                notifications.append(notif)
                if created:
                    send_realtime_notification(recipient, notif)
                    send_web_push(
                        recipient,
                        "Tu as un nouveau match sur NouMatch 💜",
                        f"Toi et {other.first_name or 'quelqu\'un'} vous vous êtes matché(e)s !",
                        conversation_link,
                    )
                    queue_event_notification_email(
                        'new_match',
                        recipient,
                        {
                            'actor_name': other.first_name or other.email.split('@')[0],
                            'cta_url': conversation_link,
                        },
                        related_object=match,
                        metadata={
                            'notification_id': notif.id,
                            'actor_id': other.id,
                            'recipient_id': recipient.id,
                            'match_id': match.id,
                        },
                    )
            except IntegrityError:
                # Concurrent creation race — notification already exists, that's fine
                logger.debug("Match notification already exists for user %s match %s", recipient.id, match.id)
            except Exception:
                logger.exception("Failed to create match notification for user %s", recipient.id)

        return notifications
    except Exception:
        logger.exception("send_match_notification failed for match %s", getattr(match, 'id', '?'))
        return []


def send_message_notification(message):
    """
    Creates/updates a message notification, grouped per conversation.
    Lookup key matches UniqueConstraint: (recipient, type, object_id).
    content_type is stored in defaults to avoid lookup mismatches.
    """
    try:
        conversation = message.conversation
        sender = message.sender
        recipient = conversation.get_other_user(sender)
        if not recipient:
            return None

        conversation_ct = ContentType.objects.get_for_model(conversation)
        title = f"{sender.first_name or sender.username or 'New'} message"
        body = (message.content or "").strip() or f"Sent a {message.message_type}"
        preview = body[:140]

        # Lookup ONLY on (recipient, type, object_id) — matching the UniqueConstraint.
        # Including content_type in the lookup causes IntegrityError when content_type
        # differs from what's stored (e.g. after a model rename or in a race condition).
        notification, created = Notification.objects.get_or_create(
            recipient=recipient,
            type='new_message',
            object_id=conversation.id,
            defaults={
                'content_type': conversation_ct,
                'title': title,
                'message': preview,
                'link': f"/messages?conversation={conversation.id}",
                'link_text': 'Open chat',
                'icon': 'envelope',
                'count': 1,
                'metadata': {
                    'conversation_id': conversation.id,
                    'sender_id': sender.id,
                    'last_message_id': message.id,
                },
                'is_read': False,
                'read_at': None,
            },
        )

        if not created:
            notification.title = title
            notification.message = preview
            notification.count = (notification.count or 1) + 1
            notification.is_read = False
            notification.read_at = None
            notification.metadata = {
                **(notification.metadata or {}),
                'conversation_id': conversation.id,
                'sender_id': sender.id,
                'last_message_id': message.id,
            }
            notification.save(update_fields=['title', 'message', 'count', 'is_read', 'read_at', 'metadata'])

        send_realtime_notification(recipient, notification)
        send_web_push(
            recipient,
            f"{sender.first_name or sender.username or 'Nouveau'} t'a envoyé un message",
            preview[:100],
            f"/messages?conversation={conversation.id}",
        )
        queue_event_notification_email(
            'new_message',
            recipient,
            {
                'actor_name': sender.first_name or sender.email.split('@')[0],
                'message_preview': preview,
                'cta_url': notification.link or f"/messages?conversation={conversation.id}",
            },
            related_object=conversation,
            metadata={
                'notification_id': notification.id,
                'actor_id': sender.id,
                'recipient_id': recipient.id,
                'conversation_id': conversation.id,
                'message_id': message.id,
            },
        )
        return notification
    except Exception:
        logger.exception("send_message_notification failed for message %s", getattr(message, 'id', '?'))
        return None

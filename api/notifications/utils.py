import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from .models import Notification
from .serializers import NotificationSerializer
from interactions.models import Like
from admin_dashboard.services.email_notifications import queue_event_notification_email


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
    except Exception as e:
        logging.info(f"Error sending realtime notification: {e}")


def send_like_notification(like):
    try:
        with transaction.atomic():
            locked_like = Like.objects.select_for_update().get(pk=like.pk)
            if locked_like.notification_sent:
                return None

            from_user = locked_like.from_user
            to_user = locked_like.to_user

            notification, created = Notification.objects.get_or_create(
                recipient=to_user,
                type='new_like',
                object_id=locked_like.id,
                defaults={
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
                        'cta_url': f"{notification.link or '/notifications'}",
                    },
                    related_object=locked_like,
                    metadata={
                        'notification_id': notification.id,
                        'actor_id': from_user.id,
                        'recipient_id': to_user.id,
                    },
                )
            return notification
    except Exception as e:
        logging.info(f"Error in send_like_notification: {e}")
        return None


def send_match_notification(match, user1, user2):
    try:
        conversation_link = None
        conversation_id = getattr(getattr(match, "conversation", None), "id", None)
        if conversation_id:
            conversation_link = f"/messages?conversation={conversation_id}"
        else:
            conversation_link = f"/messages?match={match.id}"

        n1 = Notification.objects.create(
            recipient=user1,
            type='new_match',
            title="It's a Match!",
            message=f"You matched with {user2.first_name or user2.email}!",
            link=conversation_link,
            link_text='Say Hi',
            icon='handshake',
        )
        send_realtime_notification(user1, n1)
        queue_event_notification_email(
            'new_match',
            user1,
            {
                'actor_name': user2.first_name or user2.email.split('@')[0],
                'cta_url': conversation_link or '/messages',
            },
            related_object=match,
            metadata={
                'notification_id': n1.id,
                'actor_id': user2.id,
                'recipient_id': user1.id,
                'match_id': match.id,
            },
        )

        n2 = Notification.objects.create(
            recipient=user2,
            type='new_match',
            title="It's a Match!",
            message=f"You matched with {user1.first_name or user1.email}!",
            link=conversation_link,
            link_text='Say Hi',
            icon='handshake',
        )
        send_realtime_notification(user2, n2)
        queue_event_notification_email(
            'new_match',
            user2,
            {
                'actor_name': user1.first_name or user1.email.split('@')[0],
                'cta_url': conversation_link or '/messages',
            },
            related_object=match,
            metadata={
                'notification_id': n2.id,
                'actor_id': user1.id,
                'recipient_id': user2.id,
                'match_id': match.id,
            },
        )
        return [n1, n2]
    except Exception as e:
        logging.info(f"Error creating match notifications: {e}")
        return []


def send_message_notification(message):
    try:
        conversation = message.conversation
        sender = message.sender
        recipient = conversation.get_other_user(sender)
        if not recipient:
            return None

        content_type = ContentType.objects.get_for_model(conversation)
        title = f"{sender.first_name or sender.username or 'New'} message"
        body = (message.content or "").strip() or f"Sent a {message.message_type}"
        preview = body[:140]

        notification, created = Notification.objects.get_or_create(
            recipient=recipient,
            type='new_message',
            content_type=content_type,
            object_id=conversation.id,
            defaults={
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
    except Exception as e:
        logging.info(f"Error sending message notification: {e}")
        return None

import logging
# notifications/utils.py
import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer
from interactions.models import Like

def send_realtime_notification(user, notification):
    """Send notification to user's WebSocket connection"""
    try:
        channel_layer = get_channel_layer()
        group_name = f'notifications_{user.id}'
        
        serializer = NotificationSerializer(notification)
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'send_notification',
                'notification': serializer.data
            }
        )
        logging.info(f"📨 Realtime notification sent to user {user.id}")
    except Exception as e:
        logging.info(f"❌ Error sending realtime notification: {e}")

def send_like_notification(like):
    """Send notification with a database lock to prevent duplicates."""
    try:
        with transaction.atomic():
            # Lock the like row – prevents any other process from touching it
            locked_like = Like.objects.select_for_update().get(pk=like.pk)
            
            # Double-check if already sent (inside the lock)
            if locked_like.notification_sent:
                logging.info(f"ℹ️ Like {like.pk} already has notification sent. Skipping.")
                return None

            from_user = locked_like.from_user
            to_user = locked_like.to_user

            # Try to create notification – unique constraint will also help
            notification, created = Notification.objects.get_or_create(
                recipient=to_user,
                type='new_like',
                object_id=locked_like.id,
                defaults={
                    'title': f"{from_user.first_name or 'Someone'} liked your profile! 💕",
                    'message': f"{from_user.first_name or 'Someone'} liked your profile.",
                    'link': f"/profile/{from_user.id}",
                    'link_text': 'View Profile',
                    'icon': 'heart'
                }
            )

            if created:
                # Mark the like as processed (inside the same atomic block)
                Like.objects.filter(pk=locked_like.pk).update(notification_sent=True)
                send_realtime_notification(to_user, notification)
                logging.info(f"✅ Notification created for like {like.pk}")
            else:
                logging.info(f"ℹ️ Notification already existed for like {like.pk} (race condition avoided)")

            return notification
    except Exception as e:
        logging.info(f"❌ Error in send_like_notification: {e}")
        return None

def send_match_notification(match, user1, user2):
    """Send notification to both users when they match"""
    try:
        logging.info(f"🔔 Creating match notifications for {user1.email} and {user2.email}")
        
        # Notification for user1
        notification1 = Notification.objects.create(
            recipient=user1,
            type='new_match',
            title="It's a Match! 🎉",
            message=f"You matched with {user2.first_name or user2.email}!",
            link=f"/messages?match={match.id}",
            link_text='Say Hi',
            icon='handshake'
        )
        send_realtime_notification(user1, notification1)
        
        # Notification for user2
        notification2 = Notification.objects.create(
            recipient=user2,
            type='new_match',
            title="It's a Match! 🎉",
            message=f"You matched with {user1.first_name or user1.email}!",
            link=f"/messages?match={match.id}",
            link_text='Say Hi',
            icon='handshake'
        )
        send_realtime_notification(user2, notification2)
        
        logging.info("✅ Match notifications created")
        return [notification1, notification2]
    except Exception as e:
        logging.info(f"❌ Error creating match notifications: {e}")
        return []





# notifications/utils.py
def send_message_notification(message):
    logging.info(f"\n📬 [UTILS] send_message_notification called for message {message.id}")
    
    try:
        conversation = message.conversation
        sender = message.sender
        recipient = conversation.get_other_user(sender)
        
        if not recipient:
            logging.info("   ❌ No recipient found")
            return None

        # 🔍 DEBUG: Check if there are any existing notifications for this recipient
        existing_all = Notification.objects.filter(recipient=recipient).order_by('-created_at')[:5]
        logging.info(f"🔍 [DEBUG] Last 5 notifications for user {recipient.id}:")
        for n in existing_all:
            logging.info(f"   - ID: {n.id}, type: {n.type}, is_read: {n.is_read}, read_at: {n.read_at}, created: {n.created_at}")

        # Check for existing message notifications in this conversation
        content_type = ContentType.objects.get_for_model(conversation)
        existing_msg_notif = Notification.objects.filter(
            recipient=recipient,
            type='new_message',
            content_type=content_type,
            object_id=conversation.id
        ).first()
        
        if existing_msg_notif:
            logging.info(f"🔍 [DEBUG] Found existing notification ID {existing_msg_notif.id} for this conversation")
            logging.info(f"   - Current is_read: {existing_msg_notif.is_read}")
            logging.info(f"   - Current read_at: {existing_msg_notif.read_at}")
            
            if existing_msg_notif.is_read:
                logging.info(f"⚠️ [DEBUG] This notification was READ but we're about to update it!")
        
        # Rest of your function...
        
    except Exception as e:
        logging.info(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None
    


    

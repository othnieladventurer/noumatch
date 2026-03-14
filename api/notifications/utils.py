# notifications/utils.py
import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer

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
        print(f"📨 Realtime notification sent to user {user.id}")
    except Exception as e:
        print(f"❌ Error sending realtime notification: {e}")

def send_like_notification(like):
    """Send notification when user receives a like"""
    try:
        from_user = like.from_user
        to_user = like.to_user
        
        print(f"🔔 Creating like notification for {to_user.email} from {from_user.email}")
        
        # Check if notification already exists to prevent duplicates
        existing = Notification.objects.filter(
            recipient=to_user,
            type='new_like',
            object_id=like.id
        ).first()
        
        if existing:
            print("ℹ️ Like notification already exists, skipping")
            return existing
        
        notification = Notification.objects.create(
            recipient=to_user,
            type='new_like',
            title='Someone liked your profile! 💕',
            message=f"{from_user.first_name or 'Someone'} liked your profile.",
            link=f"/profile/{from_user.id}",
            link_text='View Profile',
            icon='heart'
        )
        
        print(f"✅ Like notification created with ID: {notification.id}")
        
        # Send real-time notification
        send_realtime_notification(to_user, notification)
        
        return notification
    except Exception as e:
        print(f"❌ Error creating like notification: {e}")
        return None

def send_match_notification(match, user1, user2):
    """Send notification to both users when they match"""
    try:
        print(f"🔔 Creating match notifications for {user1.email} and {user2.email}")
        
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
        
        print("✅ Match notifications created")
        return [notification1, notification2]
    except Exception as e:
        print(f"❌ Error creating match notifications: {e}")
        return []


        
import logging
# notifications/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings
import jwt
from urllib.parse import parse_qs

User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logging.info("=" * 50)
        logging.info("🔌 WEBSOCKET CONNECT ATTEMPT")
        
        # Get token from query string
        query_string = self.scope['query_string'].decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        logging.info(f"Token present: {bool(token)}")
        logging.info(f"Path: {self.scope['path']}")
        logging.info("=" * 50)
        
        if token:
            # Authenticate with token
            user = await self.get_user_from_token(token)
            
            if user and user.is_authenticated:
                self.user = user
                self.group_name = f'notifications_{user.id}'
                
                # Add to user-specific group
                await self.channel_layer.group_add(
                    self.group_name,
                    self.channel_name
                )
                
                await self.accept()
                logging.info(f"✅ WebSocket connection accepted for user {user.id} ({user.email})")
                
                # Send confirmation
                await self.send(text_data=json.dumps({
                    'type': 'connection_success',
                    'message': 'Connected to notification server',
                    'user_id': user.id
                }))
                return
        
        # No valid token, reject connection
        logging.info("❌ WebSocket connection rejected - no valid token")
        await self.close()
    
    async def disconnect(self, close_code):
        logging.info(f"🔌 WebSocket disconnected: {close_code}")
        
        # Remove from group if we were in one
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            logging.info(f"   Removed from group: {self.group_name}")
    
    async def receive(self, text_data):
        logging.info(f"📩 Received from client: {text_data}")
        
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'mark_read':
                # Handle mark as read via WebSocket
                notification_id = data.get('notification_id')
                if notification_id and hasattr(self, 'user'):
                    await self.mark_notification_read(notification_id)
                    
                    # Send confirmation back
                    await self.send(text_data=json.dumps({
                        'type': 'notification_marked_read',
                        'notification_id': notification_id,
                        'success': True
                    }))
            
            elif action == 'mark_all_read':
                if hasattr(self, 'user'):
                    await self.mark_all_notifications_read()
                    
                    await self.send(text_data=json.dumps({
                        'type': 'all_notifications_marked_read',
                        'success': True
                    }))
            
            elif action == 'ping':
                # Keep-alive response
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
                
        except json.JSONDecodeError:
            logging.info("❌ Invalid JSON received")
        except Exception as e:
            logging.info(f"❌ Error processing message: {e}")
    
    # Notification sending method (called from other parts of the app)
    async def send_notification(self, event):
        """
        Send notification to the client
        This method is called by channel_layer.group_send
        """
        notification = event['notification']
        
        await self.send(text_data=json.dumps({
            'type': 'new_notification',
            'notification': notification
        }))
        logging.info(f"📨 Sent notification to user {self.user.id}")
    
    # Helper methods
    @database_sync_to_async
    def get_user_from_token(self, token):
        """Get user from JWT token"""
        try:
            # Decode JWT token
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=['HS256']
            )
            user_id = payload.get('user_id')
            
            if user_id:
                try:
                    user = User.objects.get(id=user_id)
                    return user
                except User.DoesNotExist:
                    logging.info(f"❌ User {user_id} not found")
                    return None
        except jwt.ExpiredSignatureError:
            logging.info("❌ Token expired")
        except jwt.InvalidTokenError as e:
            logging.info(f"❌ Invalid token: {e}")
        except Exception as e:
            logging.info(f"❌ Token error: {e}")
        
        return None
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark a notification as read in database"""
        from .models import Notification
        
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=self.user
            )
            notification.mark_as_read()
            logging.info(f"✅ Marked notification {notification_id} as read")
            return True
        except Notification.DoesNotExist:
            logging.info(f"❌ Notification {notification_id} not found")
            return False
    
    @database_sync_to_async
    def mark_all_notifications_read(self):
        """Mark all notifications as read for user"""
        from .models import Notification
        
        count = Notification.mark_all_as_read(self.user)
        logging.info(f"✅ Marked {count} notifications as read for user {self.user.id}")
        return count


        

# notifications/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("=" * 50)
        print("🔌 WEBSOCKET CONNECT ATTEMPT")
        print(f"User: {self.scope['user']}")
        print(f"Path: {self.scope['path']}")
        print("=" * 50)
        
        await self.accept()
        print("✅ WebSocket connection accepted")
        
        await self.send(text_data=json.dumps({
            'type': 'connection_success',
            'message': 'Connected to notification server'
        }))
    
    async def disconnect(self, close_code):
        print(f"🔌 WebSocket disconnected: {close_code}")
    
    async def receive(self, text_data):
        print(f"📩 Received: {text_data}")
        data = json.loads(text_data)
        
        # Echo back
        await self.send(text_data=json.dumps({
            'type': 'echo',
            'received': data
        }))



        
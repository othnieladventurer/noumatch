# your_project/routing.py
from django.urls import re_path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    # Allow query parameters in the WebSocket URL
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
]

# Simple version - just pass the query string through
application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
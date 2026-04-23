# api/asgi.py
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')

# Initialize Django ASGI application
django_asgi_app = get_asgi_application()

# Import these AFTER Django is initialized
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from notifications.consumers import NotificationConsumer
from chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns
from django.urls import path

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter([
                path('ws/notifications/', NotificationConsumer.as_asgi()),
                *chat_websocket_urlpatterns,
            ])
        )
    ),
})

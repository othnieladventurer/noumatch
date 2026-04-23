import json
import logging
from http.cookies import SimpleCookie
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication

User = get_user_model()
VERBOSE_WEBSOCKET_LOGS = getattr(settings, "VERBOSE_WEBSOCKET_LOGS", False)


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope["query_string"].decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if VERBOSE_WEBSOCKET_LOGS:
            logging.info("[WS-NOTIF] connect token_present=%s path=%s", bool(token), self.scope.get("path"))

        user = await self.get_user_from_token(token) if token else None
        if not user:
            cookie_token = self.get_access_token_from_cookie()
            user = await self.get_user_from_token(cookie_token) if cookie_token else None

        if user and user.is_authenticated:
            self.user = user
            self.group_name = f"notifications_{user.id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            if VERBOSE_WEBSOCKET_LOGS:
                logging.info("[WS-NOTIF] accepted user_id=%s", user.id)
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "connection_success",
                        "message": "Connected to notification server",
                        "user_id": user.id,
                    }
                )
            )
            return

        if VERBOSE_WEBSOCKET_LOGS:
            logging.info("[WS-NOTIF] rejected")
        await self.close()

    async def disconnect(self, close_code):
        if VERBOSE_WEBSOCKET_LOGS:
            logging.info("[WS-NOTIF] disconnected code=%s", close_code)

        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "mark_read":
                notification_id = data.get("notification_id")
                if notification_id and hasattr(self, "user"):
                    await self.mark_notification_read(notification_id)
                    await self.send(
                        text_data=json.dumps(
                            {
                                "type": "notification_marked_read",
                                "notification_id": notification_id,
                                "success": True,
                            }
                        )
                    )

            elif action == "mark_all_read":
                if hasattr(self, "user"):
                    await self.mark_all_notifications_read()
                    await self.send(
                        text_data=json.dumps(
                            {
                                "type": "all_notifications_marked_read",
                                "success": True,
                            }
                        )
                    )

            elif action == "ping":
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "pong",
                            "timestamp": data.get("timestamp"),
                        }
                    )
                )

        except json.JSONDecodeError:
            if VERBOSE_WEBSOCKET_LOGS:
                logging.info("[WS-NOTIF] invalid JSON")
        except Exception:
            logging.info("[WS-NOTIF] receive error")

    async def send_notification(self, event):
        notification = event["notification"]
        await self.send(
            text_data=json.dumps(
                {
                    "type": "new_notification",
                    "notification": notification,
                }
            )
        )

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            authenticator = JWTAuthentication()
            validated = authenticator.get_validated_token(token)
            user = authenticator.get_user(validated)
            if not user or not user.is_active:
                return None
            return user
        except Exception:
            if VERBOSE_WEBSOCKET_LOGS:
                logging.info("[WS-NOTIF] token invalid")
            return None

    def get_access_token_from_cookie(self):
        header_map = {k.decode("latin1"): v.decode("latin1") for k, v in self.scope.get("headers", [])}
        raw_cookie = header_map.get("cookie", "")
        if not raw_cookie:
            return None

        cookie = SimpleCookie()
        cookie.load(raw_cookie)
        for name in (
            getattr(settings, "AUTH_ACCESS_COOKIE_NAME", "nm_access"),
            getattr(settings, "AUTH_ADMIN_ACCESS_COOKIE_NAME", "nm_admin_access"),
        ):
            morsel = cookie.get(name)
            if morsel:
                return morsel.value
        return None

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from .models import Notification

        try:
            notification = Notification.objects.get(id=notification_id, recipient=self.user)
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False

    @database_sync_to_async
    def mark_all_notifications_read(self):
        from .models import Notification

        return Notification.mark_all_as_read(self.user)

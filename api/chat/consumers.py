import json
import logging
from http.cookies import SimpleCookie
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import Conversation

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope.get("url_route", {}).get("kwargs", {}).get("conversation_id")
        if not self.conversation_id:
            await self.close()
            return

        token = parse_qs(self.scope["query_string"].decode()).get("token", [None])[0]
        user = await self.get_user_from_token(token) if token else None
        if not user:
            cookie_token = self.get_access_token_from_cookie()
            user = await self.get_user_from_token(cookie_token) if cookie_token else None
        if not user or not user.is_authenticated:
            await self.close()
            return

        can_access = await self.user_can_access_conversation(user.id, self.conversation_id)
        if not can_access:
            await self.close()
            return

        self.user = user
        self.group_name = f"chat_{self.conversation_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({
            "type": "connection_success",
            "conversation_id": int(self.conversation_id),
            "user_id": self.user.id,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        action = data.get("action")
        if action == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))
        elif action == "typing":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat_event",
                    "event_type": "typing",
                    "payload": {"user_id": self.user.id},
                },
            )

    async def chat_event(self, event):
        await self.send(text_data=json.dumps({
            "type": event.get("event_type"),
            "payload": event.get("payload", {}),
        }))

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
            logging.info("Chat token decode error")
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
    def user_can_access_conversation(self, user_id, conversation_id):
        return Conversation.objects.filter(
            id=conversation_id
        ).filter(
            Q(match__user1_id=user_id) | Q(match__user2_id=user_id)
        ).exists()

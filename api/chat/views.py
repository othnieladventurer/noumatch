from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message, SupportConversation
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    CreateConversationSerializer,
    MarkMessagesReadSerializer,
    SupportConversationSerializer,
    UserChatSerializer,
)
from .utils import send_realtime_chat_event
from users.throttles import ChatSendMessageThrottle


ICEBREAKER_MESSAGES = [
    "Hey, happy we matched. How is your day going?",
    "Quick one: coffee, beach, or dinner for a first date?",
    "I like your profile. What is your favorite weekend activity?",
    "If we meet this week, where should we go?",
    "Looks like we have things in common. Want to talk about it?",
]

class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            Q(match__user1=self.request.user) | Q(match__user2=self.request.user)
        ).select_related("match__user1", "match__user2").prefetch_related("messages")


class ConversationDetailView(generics.RetrieveAPIView):
    serializer_class = ConversationDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            Q(match__user1=self.request.user) | Q(match__user2=self.request.user)
        )

    def retrieve(self, request, *args, **kwargs):
        conversation = self.get_object()
        updated = conversation.messages.exclude(sender=request.user).filter(read=False).update(
            read=True, read_at=timezone.now()
        )

        if updated:
            send_realtime_chat_event(
                conversation.id,
                "messages_read",
                {"conversation_id": conversation.id, "reader_id": request.user.id},
            )

        serializer = self.get_serializer(conversation)
        return Response(serializer.data)


class CreateConversationView(generics.CreateAPIView):
    serializer_class = CreateConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save()
        output_serializer = ConversationDetailSerializer(conversation, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ChatSendMessageThrottle]

    def create(self, request, *args, **kwargs):
        conversation_id = self.kwargs.get("conversation_id")
        conversation = get_object_or_404(Conversation, id=conversation_id)
        if request.user not in [conversation.match.user1, conversation.match.user2]:
            return Response({"error": "You are not part of this conversation"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        message = serializer.save(conversation=conversation, sender=request.user, sender_type="user")

        output = MessageSerializer(message, context={"request": request}).data

        transaction.on_commit(
            lambda: send_realtime_chat_event(
                conversation.id,
                "message_created",
                {
                    "conversation_id": conversation.id,
                    "message": output,
                },
            )
        )
        return Response(output, status=status.HTTP_201_CREATED)


class GetMessagesView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.kwargs.get("conversation_id")
        conversation = get_object_or_404(Conversation, id=conversation_id)
        if self.request.user not in [conversation.match.user1, conversation.match.user2]:
            return Message.objects.none()
        return conversation.messages.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        conversation_id = self.kwargs.get("conversation_id")
        updated = queryset.exclude(sender=request.user).filter(read=False).update(
            read=True, read_at=timezone.now()
        )

        if updated:
            send_realtime_chat_event(
                conversation_id,
                "messages_read",
                {"conversation_id": int(conversation_id), "reader_id": request.user.id},
            )

        serializer = self.get_serializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)


class SupportConversationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = (
            SupportConversation.objects
            .filter(user=request.user)
            .select_related("user", "assigned_admin")
            .prefetch_related("messages")
            .order_by("-updated_at")
        )
        serializer = SupportConversationSerializer(conversations, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        content = (request.data.get("content") or "").strip()
        conversation = (
            SupportConversation.objects
            .filter(user=request.user, status__in=["open", "pending"])
            .order_by("-updated_at")
            .first()
        )
        created = False
        if not conversation:
            conversation = SupportConversation.objects.create(user=request.user, status="open")
            created = True

        if content:
            Message.objects.create(
                support_conversation=conversation,
                sender=request.user,
                sender_type="user",
                content=content,
            )
            if conversation.status != "open":
                conversation.status = "open"
                conversation.save(update_fields=["status"])

        serializer = SupportConversationSerializer(conversation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SupportConversationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        conversation = get_object_or_404(
            SupportConversation.objects.select_related("user", "assigned_admin").prefetch_related("messages"),
            pk=pk,
            user=request.user,
        )
        conversation.messages.exclude(sender=request.user).filter(read=False).update(read=True)
        serializer = SupportConversationSerializer(conversation, context={"request": request})
        return Response(serializer.data)


class SupportMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id):
        conversation = get_object_or_404(SupportConversation, pk=conversation_id, user=request.user)
        queryset = conversation.messages.all().order_by("created_at")
        queryset.exclude(sender=request.user).filter(read=False).update(read=True)
        serializer = MessageSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)


class SendSupportMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ChatSendMessageThrottle]

    def post(self, request, conversation_id):
        conversation = get_object_or_404(SupportConversation, pk=conversation_id, user=request.user)
        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"error": "Message content required"}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            support_conversation=conversation,
            sender=request.user,
            sender_type="user",
            content=content,
        )
        if conversation.status != "open":
            conversation.status = "open"
            conversation.save(update_fields=["status"])

        serializer = MessageSerializer(message, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MarkMessagesReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        if request.user not in [conversation.match.user1, conversation.match.user2]:
            return Response({"error": "You are not part of this conversation"}, status=status.HTTP_403_FORBIDDEN)

        serializer = MarkMessagesReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data.get("mark_all"):
            count = conversation.messages.exclude(sender=request.user).filter(read=False).update(read=True)
        else:
            message_ids = serializer.validated_data.get("message_ids", [])
            count = conversation.messages.filter(id__in=message_ids, read=False).exclude(sender=request.user).update(read=True)

        if count:
            send_realtime_chat_event(
                conversation.id,
                "messages_read",
                {"conversation_id": conversation.id, "reader_id": request.user.id},
            )

        return Response({"message": f"{count} messages marked as read", "marked_count": count})


class UnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(
            Q(match__user1=request.user) | Q(match__user2=request.user)
        )
        support_conversations = SupportConversation.objects.filter(user=request.user)

        total_unread = 0
        conversations_with_unread = []
        for conversation in conversations:
            unread = conversation.unread_count(request.user)
            if unread > 0:
                total_unread += unread
                other_user = conversation.get_other_user(request.user)
                other_user_data = UserChatSerializer(other_user, context={"request": request}).data if other_user else None
                conversations_with_unread.append(
                    {
                        "conversation_id": conversation.id,
                        "match_id": conversation.match.id,
                        "unread_count": unread,
                        "other_user": other_user_data,
                    }
                )

        for conversation in support_conversations:
            unread = conversation.messages.exclude(sender=request.user).filter(read=False).count()
            if unread > 0:
                total_unread += unread
                conversations_with_unread.append(
                    {
                        "conversation_id": conversation.id,
                        "match_id": None,
                        "unread_count": unread,
                        "other_user": {
                            "id": 0,
                            "full_name": "NouMatch Support",
                            "profile_photo_url": None,
                            "is_online": True,
                            "online_status": "online",
                        },
                        "thread_type": "support",
                    }
                )
        return Response({"total_unread": total_unread, "conversations": conversations_with_unread})


class IcebreakerListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        if request.user not in [conversation.match.user1, conversation.match.user2]:
            return Response({"error": "You are not part of this conversation"}, status=status.HTTP_403_FORBIDDEN)

        has_started = conversation.messages.exists()
        return Response({
            "conversation_id": conversation.id,
            "has_started": has_started,
            "icebreakers": [] if has_started else ICEBREAKER_MESSAGES,
        })



from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    CreateConversationSerializer,
    MarkMessagesReadSerializer,
    UserChatSerializer
)


class ConversationListView(generics.ListAPIView):
    """List all conversations for the authenticated user"""
    serializer_class = ConversationListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            Q(match__user1=self.request.user) |
            Q(match__user2=self.request.user)
        ).select_related(
            'match__user1', 'match__user2'
        ).prefetch_related('messages')


class ConversationDetailView(generics.RetrieveAPIView):
    """Get detailed conversation with all messages"""
    serializer_class = ConversationDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            Q(match__user1=self.request.user) |
            Q(match__user2=self.request.user)
        )

    def retrieve(self, request, *args, **kwargs):
        conversation = self.get_object()

        # mark other user's messages as read
        conversation.messages.exclude(
            sender=request.user
        ).filter(read=False).update(read=True)

        serializer = self.get_serializer(conversation)
        return Response(serializer.data)


class CreateConversationView(generics.CreateAPIView):
    """Create a new conversation from a match"""
    serializer_class = CreateConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save()

        output_serializer = ConversationDetailSerializer(
            conversation,
            context={'request': request}
        )

        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )




class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        conversation_id = self.kwargs.get('conversation_id')
        conversation = get_object_or_404(Conversation, id=conversation_id)

        if self.request.user not in [conversation.match.user1, conversation.match.user2]:
            self.permission_denied("You are not part of this conversation")

        serializer.save(
            conversation=conversation,
            sender=self.request.user  # Set sender directly from authenticated user
        )
    




class GetMessagesView(generics.ListAPIView):
    """Get messages for a conversation"""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.kwargs.get('conversation_id')
        conversation = get_object_or_404(Conversation, id=conversation_id)

        if self.request.user not in [conversation.match.user1, conversation.match.user2]:
            return Message.objects.none()

        return conversation.messages.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        queryset.exclude(
            sender=request.user
        ).filter(read=False).update(read=True)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class MarkMessagesReadView(APIView):
    """Mark messages as read"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):

        conversation = get_object_or_404(
            Conversation,
            id=conversation_id
        )

        if request.user not in [conversation.match.user1, conversation.match.user2]:
            return Response(
                {"error": "You are not part of this conversation"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = MarkMessagesReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data.get("mark_all"):

            count = conversation.messages.exclude(
                sender=request.user
            ).filter(read=False).update(read=True)

        else:

            message_ids = serializer.validated_data.get(
                "message_ids", []
            )

            count = conversation.messages.filter(
                id__in=message_ids,
                read=False
            ).exclude(sender=request.user).update(read=True)

        return Response({
            "message": f"{count} messages marked as read",
            "marked_count": count
        })


class UnreadCountView(APIView):
    """Get unread messages count"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):

        conversations = Conversation.objects.filter(
            Q(match__user1=request.user) |
            Q(match__user2=request.user)
        )

        total_unread = 0
        conversations_with_unread = []

        for conversation in conversations:

            unread = conversation.unread_count(request.user)

            if unread > 0:

                total_unread += unread
                other_user = conversation.get_other_user(request.user)

                other_user_data = None

                if other_user:
                    other_user_data = UserChatSerializer(
                        other_user,
                        context={'request': request}
                    ).data

                conversations_with_unread.append({
                    "conversation_id": conversation.id,
                    "match_id": conversation.match.id,
                    "unread_count": unread,
                    "other_user": other_user_data
                })

        return Response({
            "total_unread": total_unread,
            "conversations": conversations_with_unread
        })
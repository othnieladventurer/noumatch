from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.conf import settings
from matches.models import Match
from .models import Conversation, SupportConversation, Message, MessageFlag
from PIL import Image, UnidentifiedImageError

User = get_user_model()


class UserChatSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    online_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'full_name',
            'profile_photo_url',
            'is_verified',
            'is_online',
            'online_status',
        ]

    def get_full_name(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        if obj.first_name:
            return obj.first_name
        if obj.last_name:
            return obj.last_name
        return obj.username

    def get_profile_photo_url(self, obj):
        if obj.profile_photo and hasattr(obj.profile_photo, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None

    def get_online_status(self, obj):
        if obj.is_online:
            return "online"
        if obj.last_activity:
            from django.utils import timezone
            from datetime import timedelta

            diff = timezone.now() - obj.last_activity
            if diff < timedelta(minutes=5):
                return "online"
            if diff < timedelta(hours=1):
                return f"{int(diff.total_seconds() / 60)}m ago"
            if diff < timedelta(days=1):
                return f"{int(diff.total_seconds() / 3600)}h ago"
            return f"{diff.days}d ago"
        return "offline"


class MessageSerializer(serializers.ModelSerializer):
    sender = UserChatSerializer(read_only=True)
    is_from_me = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    sender_email = serializers.EmailField(source='sender.email', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id',
            'conversation',
            'sender',
            'sender_email',
            'sender_type',
            'content',
            'message_type',
            'attachment',
            'attachment_url',
            'read',
            'created_at',
            'is_from_me',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'read',
            'conversation',
            'sender',
            'sender_email',
            'is_from_me',
            'attachment_url',
        ]
        extra_kwargs = {
            'content': {'required': False, 'allow_blank': True},
            'attachment': {'required': False, 'allow_null': True},
        }

    def get_is_from_me(self, obj):
        request = self.context.get('request')
        return bool(request and request.user and obj.sender == request.user)

    def get_attachment_url(self, obj):
        if not obj.attachment:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.attachment.url)
        return obj.attachment.url

    def validate(self, attrs):
        content = (attrs.get('content') or '').strip()
        attachment = attrs.get('attachment')
        message_type = attrs.get('message_type') or 'text'

        if not content and not attachment:
            raise serializers.ValidationError("Message content or attachment is required.")

        if attachment:
            max_bytes = int(getattr(settings, "MAX_CHAT_ATTACHMENT_BYTES", 20 * 1024 * 1024))
            if attachment.size > max_bytes:
                raise serializers.ValidationError(
                    f"Attachment too large. Max allowed is {max_bytes // (1024 * 1024)}MB."
                )

            name = (attachment.name or '').lower()
            content_type = getattr(attachment, 'content_type', '') or ''

            is_image = content_type.startswith('image/') or name.endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))
            is_video = content_type.startswith('video/') or name.endswith(('.mp4', '.mov', '.webm', '.mkv'))

            if not is_image and not is_video:
                raise serializers.ValidationError("Only image and video files are supported.")
            if is_image:
                try:
                    attachment.seek(0)
                    with Image.open(attachment) as img:
                        img.verify()
                except (UnidentifiedImageError, OSError):
                    raise serializers.ValidationError("Invalid image attachment.")
                finally:
                    attachment.seek(0)

            if is_image and message_type not in ('image', 'text'):
                raise serializers.ValidationError("Invalid message_type for image attachment.")
            if is_video and message_type not in ('video', 'text'):
                raise serializers.ValidationError("Invalid message_type for video attachment.")

            attrs['message_type'] = 'video' if is_video else 'image'

        return attrs


class ConversationListSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    match_id = serializers.IntegerField(source='match.id', read_only=True)
    has_started = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id',
            'match_id',
            'other_user',
            'last_message',
            'unread_count',
            'has_started',
            'first_message_at',
            'last_message_at',
            'created_at',
            'updated_at',
        ]

    def get_other_user(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.get_other_user(request.user)
            if other:
                return UserChatSerializer(other, context=self.context).data
        return None

    def get_last_message(self, obj):
        last_msg = obj.last_message()
        if last_msg:
            return MessageSerializer(last_msg, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.unread_count(request.user)
        return 0

    def get_has_started(self, obj):
        return obj.has_started()


class ConversationDetailSerializer(serializers.ModelSerializer):
    user1 = serializers.SerializerMethodField()
    user2 = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()
    match_details = serializers.SerializerMethodField()
    has_started = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id',
            'user1',
            'user2',
            'messages',
            'match_details',
            'has_started',
            'first_message_at',
            'last_message_at',
            'created_at',
            'updated_at',
        ]

    def get_user1(self, obj):
        return UserChatSerializer(obj.match.user1, context=self.context).data

    def get_user2(self, obj):
        return UserChatSerializer(obj.match.user2, context=self.context).data

    def get_messages(self, obj):
        return MessageSerializer(obj.messages.all(), many=True, context=self.context).data

    def get_match_details(self, obj):
        return {
            'match_id': obj.match.id,
            'matched_at': obj.match.created_at,
            'user1_id': obj.match.user1.id,
            'user2_id': obj.match.user2.id,
        }

    def get_has_started(self, obj):
        return obj.has_started()


class CreateConversationSerializer(serializers.Serializer):
    match_id = serializers.IntegerField()

    def validate_match_id(self, value):
        try:
            match = Match.objects.get(id=value)
        except Match.DoesNotExist as exc:
            raise serializers.ValidationError("Match does not exist") from exc

        request = self.context.get('request')
        if request and request.user:
            if request.user not in [match.user1, match.user2]:
                raise serializers.ValidationError("You are not part of this match")
            if hasattr(match, 'conversation'):
                raise serializers.ValidationError("Conversation already exists for this match")
        return value

    def create(self, validated_data):
        match = Match.objects.get(id=validated_data['match_id'])
        return Conversation.objects.create(match=match)


class MarkMessagesReadSerializer(serializers.Serializer):
    message_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    mark_all = serializers.BooleanField(default=False)

    def validate(self, data):
        if not data.get('message_ids') and not data.get('mark_all'):
            raise serializers.ValidationError("Either message_ids or mark_all must be provided")
        return data


class SupportConversationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = SupportConversation
        fields = ['id', 'user', 'user_email', 'assigned_admin', 'status', 'created_at', 'updated_at', 'last_message']

    def get_last_message(self, obj):
        msg = obj.last_message()
        if not msg:
            return None
        return {
            'content': msg.content,
            'created_at': msg.created_at,
            'sender_type': msg.sender_type,
        }


class MessageFlagSerializer(serializers.ModelSerializer):
    message_content = serializers.CharField(source='message.content', read_only=True)
    sender_email = serializers.EmailField(source='message.sender.email', read_only=True)

    class Meta:
        model = MessageFlag
        fields = ['id', 'message', 'message_content', 'sender_email', 'reason', 'score', 'created_at']

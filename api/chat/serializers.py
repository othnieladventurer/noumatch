from rest_framework import serializers
from django.contrib.auth import get_user_model
from matches.models import Match

from .models import Conversation, SupportConversation, Message, MessageFlag


from django.contrib.auth import get_user_model
User = get_user_model()


class UserChatSerializer(serializers.ModelSerializer):
    """Minimal user serializer for chat responses"""
    profile_photo_url = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    online_status = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 
            'full_name', 'profile_photo_url', 'is_verified',
            'is_online', 'online_status'
        ]
    
    def get_full_name(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        elif obj.first_name:
            return obj.first_name
        elif obj.last_name:
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
        """Return online status with time"""
        if obj.is_online:
            return "online"
        elif obj.last_activity:
            from django.utils import timezone
            from datetime import timedelta
            
            now = timezone.now()
            diff = now - obj.last_activity
            
            if diff < timedelta(minutes=5):
                return "online"
            elif diff < timedelta(hours=1):
                minutes = int(diff.total_seconds() / 60)
                return f"{minutes}m ago"
            elif diff < timedelta(days=1):
                hours = int(diff.total_seconds() / 3600)
                return f"{hours}h ago"
            else:
                days = diff.days
                return f"{days}d ago"
        return "offline"

        


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual messages"""
    sender = UserChatSerializer(read_only=True)
    is_from_me = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 
            'content', 'read', 'created_at', 'is_from_me'
        ]
        read_only_fields = ['id', 'created_at', 'read', 'conversation', 'sender']
    
    def get_is_from_me(self, obj):
        """Check if the message is from the requesting user"""
        request = self.context.get('request')
        if request and request.user:
            return obj.sender == request.user
        return False


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer for conversation list view"""
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    match_id = serializers.IntegerField(source='match.id', read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'match_id', 'other_user', 'last_message', 
            'unread_count', 'created_at', 'updated_at'
        ]
    
    def get_other_user(self, obj):
        """Get the other user in the conversation"""
        request = self.context.get('request')
        if request and request.user:
            other = obj.get_other_user(request.user)
            if other:
                return UserChatSerializer(other, context=self.context).data
        return None
    
    def get_last_message(self, obj):
        """Get the most recent message"""
        last_msg = obj.last_message()
        if last_msg:
            return MessageSerializer(last_msg, context=self.context).data
        return None
    
    def get_unread_count(self, obj):
        """Get unread count for current user"""
        request = self.context.get('request')
        if request and request.user:
            return obj.unread_count(request.user)
        return 0


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Serializer for conversation detail with messages"""
    user1 = serializers.SerializerMethodField()
    user2 = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()
    match_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'user1', 'user2', 'messages', 
            'match_details', 'created_at', 'updated_at'
        ]
    
    def get_user1(self, obj):
        return UserChatSerializer(obj.match.user1, context=self.context).data
    
    def get_user2(self, obj):
        return UserChatSerializer(obj.match.user2, context=self.context).data
    
    def get_messages(self, obj):
        """Get all messages in the conversation"""
        messages = obj.messages.all()
        return MessageSerializer(messages, many=True, context=self.context).data
    
    def get_match_details(self, obj):
        """Get match information"""
        return {
            'match_id': obj.match.id,
            'matched_at': obj.match.created_at,
            'user1_id': obj.match.user1.id,
            'user2_id': obj.match.user2.id
        }


class CreateConversationSerializer(serializers.Serializer):
    """Serializer for creating a new conversation from a match"""
    match_id = serializers.IntegerField()
    
    def validate_match_id(self, value):
        """Validate that the match exists and belongs to the user"""
        try:
            match = Match.objects.get(id=value)
        except Match.DoesNotExist:
            raise serializers.ValidationError("Match does not exist")
        
        request = self.context.get('request')
        if request and request.user:
            if request.user not in [match.user1, match.user2]:
                raise serializers.ValidationError("You are not part of this match")
            
            # Check if conversation already exists
            if hasattr(match, 'conversation'):
                raise serializers.ValidationError("Conversation already exists for this match")
        
        return value
    
    def create(self, validated_data):
        match = Match.objects.get(id=validated_data['match_id'])
        
        # Create conversation linked to the match
        conversation = Conversation.objects.create(match=match)
        
        return conversation


class MarkMessagesReadSerializer(serializers.Serializer):
    """Serializer for marking messages as read"""
    message_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    mark_all = serializers.BooleanField(default=False)
    
    def validate(self, data):
        """Validate that either message_ids or mark_all is provided"""
        if not data.get('message_ids') and not data.get('mark_all'):
            raise serializers.ValidationError(
                "Either message_ids or mark_all must be provided"
            )
        return data











class MessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source='sender.email', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_email', 'sender_type', 'content', 'read', 'created_at']
        read_only_fields = ['id', 'created_at', 'read']







class ConversationSerializer(serializers.ModelSerializer):
    other_user_email = serializers.SerializerMethodField()
    last_message = MessageSerializer(source='last_message', read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'match', 'other_user_email', 'created_at', 'updated_at', 'last_message', 'unread_count']

    def get_other_user_email(self, obj):
        user = self.context['request'].user
        other = obj.get_other_user(user)
        return other.email if other else None

    def get_unread_count(self, obj):
        return obj.unread_count(self.context['request'].user)








class SupportConversationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = SupportConversation
        fields = ['id', 'user', 'user_email', 'assigned_admin', 'status', 'created_at', 'updated_at', 'last_message']

    def get_last_message(self, obj):
        msg = obj.last_message()
        if msg:
            return {
                'content': msg.content,
                'created_at': msg.created_at,
                'sender_type': msg.sender_type
            }
        return None







class MessageFlagSerializer(serializers.ModelSerializer):
    message_content = serializers.CharField(source='message.content', read_only=True)
    sender_email = serializers.EmailField(source='message.sender.email', read_only=True)

    class Meta:
        model = MessageFlag
        fields = ['id', 'message', 'message_content', 'sender_email', 'reason', 'score', 'created_at']















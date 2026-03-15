# notifications/serializers.py
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    time_ago = serializers.SerializerMethodField()
    display_title = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'message',
            'link', 'link_text', 'priority', 'priority_display',
            'icon', 'is_read', 'is_seen', 'created_at', 'time_ago',
            'count', 'metadata', 'display_title'  # 👈 NEW FIELDS ADDED
        ]
        read_only_fields = ['id', 'created_at', 'count', 'metadata']
    
    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)
    
    def get_display_title(self, obj):
        """Return title with count if > 1"""
        if obj.type == 'new_message' and obj.count > 1:
            return f"{obj.count}x {obj.title}"
        return obj.title

class NotificationMarkReadSerializer(serializers.Serializer):
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    mark_all = serializers.BooleanField(default=False)

class NotificationCreateSerializer(serializers.Serializer):
    """For creating custom notifications (admin only)"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    type = serializers.ChoiceField(choices=Notification.Type.choices)
    priority = serializers.ChoiceField(
        choices=Notification.Priority.choices,
        default=Notification.Priority.MEDIUM
    )
    link = serializers.CharField(max_length=500, required=False, allow_blank=True)
    link_text = serializers.CharField(max_length=100, required=False, default="View")
    icon = serializers.CharField(max_length=50, required=False, default="bell")
    # 👇 Optional fields for advanced usage
    count = serializers.IntegerField(required=False, default=1)
    metadata = serializers.JSONField(required=False, default=dict)

    
    
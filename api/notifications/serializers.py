# notifications/serializers.py
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'message',
            'link', 'link_text', 'priority', 'priority_display',
            'icon', 'is_read', 'is_seen', 'created_at', 'time_ago'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)

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



    
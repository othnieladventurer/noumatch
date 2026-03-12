from rest_framework import serializers
from .models import Report
from django.contrib.auth import get_user_model

User = get_user_model()

class ReportSerializer(serializers.ModelSerializer):
    reporter_name = serializers.SerializerMethodField()
    reported_user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Report
        fields = [
            'id',
            'reporter',
            'reporter_name',
            'reported_user',
            'reported_user_name',
            'match',
            'reason',
            'description',
            'screenshot',
            'status',
            'created_at',
            'updated_at',
            'action_taken',
        ]
        read_only_fields = ['id', 'reporter', 'status', 'created_at', 'updated_at', 'action_taken']
    
    def get_reporter_name(self, obj):
        if obj.reporter.first_name and obj.reporter.last_name:
            return f"{obj.reporter.first_name} {obj.reporter.last_name}"
        return obj.reporter.email
    
    def get_reported_user_name(self, obj):
        if obj.reported_user.first_name and obj.reported_user.last_name:
            return f"{obj.reported_user.first_name} {obj.reported_user.last_name}"
        return obj.reported_user.email
    
    def validate(self, data):
        request = self.context.get('request')
        if request and request.user:
            # Prevent self-reporting
            if data.get('reported_user') == request.user:
                raise serializers.ValidationError("You cannot report yourself")
            
            # Check if users have matched (optional)
            # You can add logic here to verify they are matched
        return data

class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'reported_user',
            'match',
            'reason',
            'description',
            'screenshot',
        ]
    
    def validate_reported_user(self, value):
        request = self.context.get('request')
        if request and request.user == value:
            raise serializers.ValidationError("You cannot report yourself")
        return value
    
    def create(self, validated_data):
        validated_data['reporter'] = self.context['request'].user
        validated_data['status'] = 'pending'
        return super().create(validated_data)

class ReportStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['status', 'admin_notes', 'action_taken']



        
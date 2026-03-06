# block/serializers.py
from rest_framework import serializers
from .models import Block
from users.models import User
from users.serializers import UserProfileSerializer  # Use existing serializer

class BlockSerializer(serializers.ModelSerializer):
    blocked_user = serializers.SerializerMethodField()
    
    class Meta:
        model = Block
        fields = ('id', 'blocker', 'blocked', 'blocked_user', 'created_at')
        read_only_fields = ('id', 'blocker', 'created_at')
    
    def get_blocked_user(self, obj):
        # Use UserProfileSerializer which already has first_name, last_name, age, etc.
        return UserProfileSerializer(obj.blocked).data
    
    def validate(self, data):
        request = self.context.get('request')
        if request and request.user:
            # Can't block yourself
            if data['blocked'] == request.user:
                raise serializers.ValidationError("You cannot block yourself.")
            
            # Check if already blocked
            if Block.objects.filter(blocker=request.user, blocked=data['blocked']).exists():
                raise serializers.ValidationError("You have already blocked this user.")
        
        return data
    
    
from rest_framework import serializers
from users.models import User
from block.models import Block





class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'is_active', 'is_verified']





class BlockSerializer(serializers.ModelSerializer):
    blocker_email = serializers.EmailField(source='blocker.email')
    blocked_email = serializers.EmailField(source='blocked.email')

    class Meta:
        model = Block
        fields = ['id', 'blocker_email', 'blocked_email', 'created_at']







        
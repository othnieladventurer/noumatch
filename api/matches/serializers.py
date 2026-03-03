from rest_framework import serializers
from .models import Match
from users.serializers import UserProfileSerializer

class MatchSerializer(serializers.ModelSerializer):
    user1_details = UserProfileSerializer(source='user1', read_only=True)
    user2_details = UserProfileSerializer(source='user2', read_only=True)
    
    class Meta:
        model = Match
        fields = ['id', 'user1', 'user2', 'user1_details', 'user2_details', 'created_at']
        read_only_fields = ['created_at']


        
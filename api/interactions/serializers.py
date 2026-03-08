from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Like
from datetime import date

User = get_user_model()
class UserMinimalSerializer(serializers.ModelSerializer):
    # Add age as a calculated field
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'profile_photo', 'birth_date', 'bio', 'gender', 'age')
    
    def get_age(self, obj):
        """Calculate age from birth_date"""
        if obj.birth_date:
            today = date.today()
            return today.year - obj.birth_date.year - (
                (today.month, today.day) < (obj.birth_date.month, obj.birth_date.day)
            )
        return None



class LikeSerializer(serializers.ModelSerializer):
    from_user = UserMinimalSerializer(read_only=True)
    to_user = UserMinimalSerializer(read_only=True)
    to_user_id = serializers.IntegerField(write_only=True)
    
    # Optional: Add a field to check if it's a mutual like
    is_mutual = serializers.SerializerMethodField()

    class Meta:
        model = Like
        fields = ('id', 'from_user', 'to_user', 'to_user_id', 'created_at', 'is_mutual')
        read_only_fields = ('id', 'from_user', 'created_at', 'is_mutual')

    def get_is_mutual(self, obj):
        """Check if this is a mutual like (both users like each other)"""
        return Like.objects.filter(
            from_user=obj.to_user,
            to_user=obj.from_user
        ).exists()

    def validate_to_user_id(self, value):
        request = self.context.get('request')
        if not request or not request.user:
            return value

        if value == request.user.id:
            raise serializers.ValidationError("You cannot like yourself.")

        if Like.objects.filter(from_user=request.user, to_user_id=value).exists():
            raise serializers.ValidationError("You have already liked this user.")

        return value

    def create(self, validated_data):
        validated_data['from_user'] = self.context['request'].user
        return super().create(validated_data)
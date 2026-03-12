from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Like, Pass, DailySwipe
from datetime import date, timedelta
from django.utils import timezone

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'profile_photo', 'birth_date', 'bio', 'gender', 'age')
    
    def get_age(self, obj):
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
    is_mutual = serializers.SerializerMethodField()

    class Meta:
        model = Like
        fields = ('id', 'from_user', 'to_user', 'to_user_id', 'created_at', 'is_mutual')
        read_only_fields = ('id', 'from_user', 'created_at', 'is_mutual')

    def get_is_mutual(self, obj):
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





class PassSerializer(serializers.ModelSerializer):
    from_user = UserMinimalSerializer(read_only=True)
    to_user = UserMinimalSerializer(read_only=True)
    to_user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Pass
        fields = ('id', 'from_user', 'to_user', 'to_user_id', 'created_at', 'expires_at')
        read_only_fields = ('id', 'from_user', 'created_at')

    def validate_to_user_id(self, value):
        request = self.context.get('request')
        if not request or not request.user:
            return value

        if value == request.user.id:
            raise serializers.ValidationError("You cannot pass on yourself.")

        # Check if already passed
        if Pass.objects.filter(from_user=request.user, to_user_id=value).exists():
            raise serializers.ValidationError("You have already passed on this user.")

        # Optional: Check if liked (can't pass on someone you liked)
        if Like.objects.filter(from_user=request.user, to_user_id=value).exists():
            raise serializers.ValidationError("You cannot pass on someone you've already liked.")

        return value

    def create(self, validated_data):
        validated_data['from_user'] = self.context['request'].user
        
        # Optional: Set expiry date (e.g., 30 days from now)
        # validated_data['expires_at'] = timezone.now() + timedelta(days=30)
        
        return super().create(validated_data)


class PassCheckSerializer(serializers.Serializer):
    """Serializer for checking if a user has been passed"""
    has_passed = serializers.BooleanField()
    passed_at = serializers.DateTimeField(allow_null=True)


class BulkPassSerializer(serializers.Serializer):
    """Serializer for passing on multiple users at once"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )

    def validate_user_ids(self, value):
        request = self.context.get('request')
        if not request or not request.user:
            return value

        # Check for self-pass
        if request.user.id in value:
            raise serializers.ValidationError("You cannot pass on yourself.")

        # Check for duplicates
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate user IDs are not allowed.")

        return value







class DailySwipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySwipe
        fields = ['id', 'swipe_type', 'count', 'date']




class SwipeLimitSerializer(serializers.Serializer):
    can_like = serializers.BooleanField()
    likes_remaining = serializers.IntegerField()
    likes_today = serializers.IntegerField()
    daily_limit = serializers.IntegerField()



from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Match
from datetime import date

User = get_user_model()



class UserMatchSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'profile_photo', 'profile_photo_url', 'bio', 'gender', 'age')

    def get_age(self, obj):
        if obj.birth_date:
            today = date.today()
            return today.year - obj.birth_date.year - (
                (today.month, today.day) < (obj.birth_date.month, obj.birth_date.day)
            )
        return None

    def get_profile_photo_url(self, obj):
        if obj.profile_photo and hasattr(obj.profile_photo, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None







class MatchSerializer(serializers.ModelSerializer):
    user1 = UserMatchSerializer(read_only=True)
    user2 = UserMatchSerializer(read_only=True)

    class Meta:
        model = Match
        fields = ('id', 'user1', 'user2', 'created_at')
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserPhoto
from django.utils import timezone
from django.conf import settings
from datetime import timedelta, date
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify
from django.contrib.auth import get_user_model
from rest_framework import serializers
from datetime import date
import random
import string
import time



class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Fields you want superuser to see
        fields = [
            "id",
            "email",
            "username",
            "first_name",      # 👈 ADD THIS
            "last_name",       # 👈 ADD THIS
            "birth_date",
            "gender",
            "location",
            "profile_photo",
            "is_active",
            "is_verified",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined", "is_verified"]



class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    country = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'email', 
            'first_name', 
            'last_name', 
            'birth_date', 
            'gender',   # Only gender – no interested_in
            'profile_photo', 
            'password', 
            'password2',
            'country',
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'birth_date': {'required': True},
            'gender': {'required': True},
            'profile_photo': {'required': False},
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def validate_birth_date(self, value):
        from datetime import date
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError("You must be at least 18 years old to register.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        validated_data['username'] = validated_data['email'].split('@')[0]
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user





class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid email or password.")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled.")
        else:
            raise serializers.ValidationError("Both email and password are required.")

        attrs["user"] = user
        return attrs




class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, data):
        user = self.context["request"].user

        if not user.check_password(data["old_password"]):
            raise serializers.ValidationError(
                {"old_password": "Old password is incorrect"}
            )

        return data

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user




class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",      
            "last_name",      
            "bio",
            "birth_date",
            "profile_photo",
            "account_type",
        ]



class UserProfileSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    online_status = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'bio', 'birth_date', 'age',
            'gender', 'location', 'profile_photo',
            'height', 'passions', 'career', 'education', 'hobbies',
            'favorite_music', 'is_verified', 'is_active',
            'is_online', 'last_activity', 'online_status'
        ]
        read_only_fields = ['is_online', 'last_activity']
    
    def get_age(self, obj):
        if obj.birth_date:
            from datetime import date
            today = date.today()
            return today.year - obj.birth_date.year - (
                (today.month, today.day) < (obj.birth_date.month, obj.birth_date.day)
            )
        return None
    
    def get_online_status(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        if obj.is_online:
            return "online"
        elif obj.last_activity:
            now = timezone.now()
            diff = now - obj.last_activity
            
            if diff < timedelta(minutes=1):
                return "Just now"
            elif diff < timedelta(hours=1):
                minutes = int(diff.total_seconds() / 60)
                return f"Active {minutes} minute{'s' if minutes != 1 else ''} ago"
            elif diff < timedelta(days=1):
                hours = int(diff.total_seconds() / 3600)
                return f"Active {hours} hour{'s' if hours != 1 else ''} ago"
            elif diff < timedelta(days=7):
                days = diff.days
                return f"Active {days} day{'s' if days != 1 else ''} ago"
            else:
                return f"Last seen {obj.last_activity.strftime('%b %d, %Y')}"
        return "Offline"        




class UserPhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    user_email = serializers.ReadOnlyField(source='user.email')
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPhoto
        fields = [
            'id', 
            'user', 
            'user_email',
            'user_name',
            'image', 
            'image_url', 
            'uploaded_at'
        ]
        read_only_fields = ['id', 'user', 'uploaded_at']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return f"{settings.MEDIA_URL}{obj.image.url}"
        return None
    
    def get_user_name(self, obj):
        if obj.user:
            if obj.user.first_name and obj.user.last_name:
                return f"{obj.user.first_name} {obj.user.last_name}"
            return obj.user.first_name or obj.user.last_name or obj.user.username
        return None
    
    def validate(self, data):
        """Validate that user doesn't exceed 10 photos"""
        user = self.context['request'].user
        if not self.instance and user.photos.count() >= 10:
            raise serializers.ValidationError(
                "You cannot upload more than 10 photos."
            )
        return data
    







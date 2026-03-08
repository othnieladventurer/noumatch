from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User
from django.utils import timezone
from datetime import timedelta, date
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify
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
            "interested_in",
            "location",
            "profile_photo",
            "is_active",
            "is_verified",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined", "is_verified"]



class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "birth_date",
            "gender",
            "interested_in",
            "profile_photo",
            "password",
        )

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def generate_unique_username(self, first_name, last_name):
        """Generate a unique username from first and last name"""
        # Create base username
        base_username = f"{first_name.lower()}.{last_name.lower()}"
        base_username = slugify(base_username.replace('.', '-'))
        
        username = base_username
        counter = 1
        
        # Keep trying until we find a unique username
        while User.objects.filter(username=username).exists():
            # Add random suffix if base username is taken
            random_suffix = ''.join(random.choices(string.digits, k=4))
            username = f"{base_username}_{random_suffix}"
            counter += 1
            if counter > 10:  # Prevent infinite loop
                # Final fallback with timestamp
                timestamp = str(int(time.time()))[-6:]
                username = f"{base_username}_{timestamp}"
                break
        
        return username

    def create(self, validated_data):
        password = validated_data.pop("password")
        first_name = validated_data.pop("first_name")
        last_name = validated_data.pop("last_name")
        
        # Auto-generate username from first and last name
        username = self.generate_unique_username(first_name, last_name)
        
        # Create user with all fields
        user = User.objects.create_user(
            email=validated_data["email"],
            username=username,
            first_name=first_name,
            last_name=last_name,
            password=password,
            birth_date=validated_data.get("birth_date"),
            gender=validated_data.get("gender", ""),
            interested_in=validated_data.get("interested_in", ""),
            profile_photo=validated_data.get("profile_photo"),
        )
        
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
            "first_name",      # 👈 ADD THIS
            "last_name",       # 👈 ADD THIS
            "bio",
            "birth_date",
            "profile_photo",
        ]




class UserProfileSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    online_status = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'bio', 'birth_date', 'age',
            'gender', 'interested_in', 'location', 'profile_photo',
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
        """Return online status with time"""
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

        
                
                
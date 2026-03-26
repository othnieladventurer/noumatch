from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserPhoto
from django.utils import timezone
from django.conf import settings
from datetime import timedelta, date
from django.contrib.auth.password_validation import validate_password
from django.core.files.storage import default_storage
from rest_framework_simplejwt.tokens import RefreshToken
import random
import string
import time
import requests


def get_absolute_image_url(file_field):
    """Get absolute URL for image file (works with Cloudflare R2)"""
    if file_field:
        return file_field.url
    return None


class UserSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "birth_date",
            "gender",
            "location",
            "profile_photo",
            "profile_photo_url",
            "is_active",
            "is_verified",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined", "is_verified"]

    def get_profile_photo_url(self, obj):
        return get_absolute_image_url(obj.profile_photo)





class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    country = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'email', 
            'first_name', 
            'last_name', 
            'birth_date', 
            'gender',
            'profile_photo', 
            'password', 
            'password2',
            'country',
            'city',
            'latitude',
            'longitude',
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'birth_date': {'required': True},
            'gender': {'required': True},
            'profile_photo': {'required': False},
            'city': {'required': False},
            'latitude': {'required': False, 'allow_null': True},
            'longitude': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def validate_birth_date(self, value):
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError("You must be at least 18 years old to register.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def get_coordinates_from_ip(self, ip_address=None):
        """Get latitude and longitude from IP address using ipapi.co"""
        try:
            if ip_address:
                url = f'https://ipapi.co/{ip_address}/json/'
            else:
                url = 'https://ipapi.co/json/'
            
            response = requests.get(url, timeout=5)
            data = response.json()
            
            if response.status_code == 200 and data.get('latitude') and data.get('longitude'):
                return {
                    'latitude': data.get('latitude'),
                    'longitude': data.get('longitude'),
                    'country': data.get('country_name', ''),
                    'city': data.get('city', '')
                }
        except Exception as e:
            print(f"Error getting coordinates: {e}")
        
        return {
            'latitude': None,
            'longitude': None,
            'country': '',
            'city': ''
        }

    def create(self, validated_data):
        # Get the request object to access client IP
        request = self.context.get('request')
        client_ip = None
        
        if request:
            # Get client IP from request headers
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                client_ip = x_forwarded_for.split(',')[0]
            else:
                client_ip = request.META.get('REMOTE_ADDR')
        
        # Log for debugging
        print(f"🔍 Client IP: {client_ip}")
        
        # Get coordinates from IP address (fallback if frontend didn't send them)
        if not validated_data.get('latitude') and not validated_data.get('longitude'):
            location_data = self.get_coordinates_from_ip(client_ip)
            
            # Only set if coordinates were found
            if location_data['latitude'] and location_data['longitude']:
                validated_data['latitude'] = location_data['latitude']
                validated_data['longitude'] = location_data['longitude']
                print(f"📍 Coordinates from IP: {location_data['latitude']}, {location_data['longitude']}")
            
            # Auto-fill country and city if not provided by frontend
            if not validated_data.get('country') and location_data['country']:
                validated_data['country'] = location_data['country']
                print(f"📍 Country from IP: {location_data['country']}")
            if not validated_data.get('city') and location_data['city']:
                validated_data['city'] = location_data['city']
                print(f"📍 City from IP: {location_data['city']}")
        else:
            # Frontend provided coordinates
            print(f"📍 Coordinates from frontend: {validated_data.get('latitude')}, {validated_data.get('longitude')}")
            print(f"📍 Location from frontend: {validated_data.get('city')}, {validated_data.get('country')}")
        
        # Remove password2 as it's not needed for user creation
        validated_data.pop('password2')
        password = validated_data.pop('password')
        
        # Create username from email
        validated_data['username'] = validated_data['email'].split('@')[0]
        
        # Create user
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        print(f"✅ User created: {user.email} - Location saved: {user.city}, {user.country} - Coordinates: {user.latitude}, {user.longitude}")
        
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
    profile_photo_url = serializers.SerializerMethodField()

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
            "profile_photo_url",
            "account_type",
        ]
        read_only_fields = ["id", "email", "username"]

    def get_profile_photo_url(self, obj):
        return get_absolute_image_url(obj.profile_photo)





class UserProfileSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    online_status = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'bio', 'birth_date', 'age',
            'gender', 'location', 'profile_photo',
            'profile_photo_url',  # Add this field
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
    
    def get_profile_photo_url(self, obj):
        """Return the absolute URL for the profile photo"""
        if obj.profile_photo:
            return obj.profile_photo.url
        return None






class UserPhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    user_email = serializers.ReadOnlyField(source='user.email')
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = UserPhoto
        fields = [
            "id",
            "user",
            "user_email",
            "user_name",
            "image",
            "image_url",
            "uploaded_at",
        ]
        read_only_fields = ["id", "user", "uploaded_at"]

    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None

    def get_user_name(self, obj):
        if obj.user:
            if obj.user.first_name and obj.user.last_name:
                return f"{obj.user.first_name} {obj.user.last_name}"
            return obj.user.first_name or obj.user.last_name or obj.user.username
        return None

    def validate(self, data):
        user = self.context['request'].user
        if not self.instance and user.photos.count() >= 10:
            raise serializers.ValidationError(
                "You cannot upload more than 10 photos."
            )
        return data


import logging
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import authenticate
from .models import PendingRegistration, User, UserPhoto
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from django.conf import settings
from datetime import timedelta, date
from django.contrib.auth.password_validation import validate_password
from django.core.files.storage import default_storage
from rest_framework_simplejwt.tokens import RefreshToken
import random
import string
import time
import requests
from django.db.models import Q
from PIL import Image, UnidentifiedImageError

from matches.models import Match
from report.models import Report
from block.models import Block
from interactions.models import Like, Pass


def detect_location_from_ip(ip_address=None):
    """Resolve country, city, and coordinates from IP with HTTPS-safe fallbacks."""
    providers = []
    if ip_address:
        providers.append(f"https://ipapi.co/{ip_address}/json/")
        providers.append(f"https://ipwho.is/{ip_address}")
    else:
        providers.append("https://ipapi.co/json/")
        providers.append("https://ipwho.is/")

    for url in providers:
        try:
            response = requests.get(url, timeout=5)
            data = response.json()
        except Exception:
            continue

        if "ipapi.co" in url:
            if response.status_code == 200 and data.get("country_name"):
                return {
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                    "country": data.get("country_name", ""),
                    "city": data.get("city", ""),
                    "country_code": (data.get("country_code") or "").lower(),
                }

        if "ipwho.is" in url:
            if response.status_code == 200 and data.get("success", True) and data.get("country"):
                return {
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                    "country": data.get("country", ""),
                    "city": data.get("city", ""),
                    "country_code": (data.get("country_code") or "").lower(),
                }

    return {
        "latitude": None,
        "longitude": None,
        "country": "",
        "city": "",
        "country_code": "",
    }


def get_absolute_image_url(file_field):
    """Get absolute URL for image file (works with Cloudflare R2)"""
    if file_field:
        return file_field.url
    return None


def validate_uploaded_image(image_file):
    max_bytes = getattr(settings, "MAX_UPLOAD_IMAGE_BYTES", 10 * 1024 * 1024)
    if image_file.size > max_bytes:
        raise serializers.ValidationError(
            f"Image exceeds max size of {max_bytes // (1024 * 1024)}MB."
        )
    try:
        image_file.seek(0)
        with Image.open(image_file) as img:
            if (img.format or "").upper() not in {"JPEG", "PNG", "GIF", "WEBP"}:
                raise serializers.ValidationError("Unsupported image format. Use JPG, PNG, GIF, or WEBP.")
    except (UnidentifiedImageError, OSError):
        raise serializers.ValidationError("Invalid image file.")
    finally:
        image_file.seek(0)
    return image_file

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
    signup_source = serializers.CharField(required=False, allow_blank=True, max_length=64)
    utm_source = serializers.CharField(required=False, allow_blank=True, max_length=255)
    utm_medium = serializers.CharField(required=False, allow_blank=True, max_length=255)
    utm_campaign = serializers.CharField(required=False, allow_blank=True, max_length=255)
    utm_content = serializers.CharField(required=False, allow_blank=True, max_length=255)
    utm_term = serializers.CharField(required=False, allow_blank=True, max_length=255)
    landing_page = serializers.CharField(required=False, allow_blank=True, max_length=255)

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
            'signup_source',
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_content',
            'utm_term',
            'landing_page',
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
            'signup_source': {'required': False},
            'utm_source': {'required': False},
            'utm_medium': {'required': False},
            'utm_campaign': {'required': False},
            'utm_content': {'required': False},
            'utm_term': {'required': False},
            'landing_page': {'required': False},
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        profile_photo = data.get("profile_photo")
        if profile_photo:
            validate_uploaded_image(profile_photo)
        return data

    def validate_birth_date(self, value):
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError("Vous devez avoir au moins 18 ans pour vous inscrire.")
        return value

    def validate_email(self, value):
        from waitlist.models import WaitlistEntry, ContactedArchive
        
        email = value.strip().lower()
        
        # Check if already registered
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé. Veuillez vous connecter.")
        
        # Check if in waitlist and contacted
        waitlist_entry = WaitlistEntry.objects.filter(email=email, contacted=True).first()
        
        if waitlist_entry:
            # User is authorized to register
            return value
        
        # Check in contacted archive
        archived_entry = ContactedArchive.objects.filter(email=email).first()
        
        if archived_entry:
            # User was contacted and archived - allowed to register
            return value
        
        # User not authorized to register
        raise serializers.ValidationError(
            "Accès non autorisé. Vous devez d'abord rejoindre la liste d'attente et être contacté par notre équipe pour vous inscrire."
        )

    def get_coordinates_from_ip(self, ip_address=None):
        """Get latitude and longitude from IP address using ipapi.co"""
        try:
            return detect_location_from_ip(ip_address)
        except Exception:
            logging.info("Error getting coordinates from IP provider")
            return {
                'latitude': None,
                'longitude': None,
                'country': '',
                'city': '',
                'country_code': '',
            }

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Cet email est dÃ©jÃ  utilisÃ©. Veuillez vous connecter.")
        return email

    def _enrich_location_data(self, validated_data):
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
        
        has_coordinates = validated_data.get('latitude') and validated_data.get('longitude')
        has_location_labels = bool(validated_data.get('country') or validated_data.get('city'))

        # Avoid blocking registration on third-party geolocation when the form already
        # provided a usable country/city. The dedicated location endpoint can still do
        # richer detection before submit.
        if not has_coordinates and not has_location_labels:
            location_data = self.get_coordinates_from_ip(client_ip)
            
            # Only set if coordinates were found
            if location_data['latitude'] and location_data['longitude']:
                validated_data['latitude'] = location_data['latitude']
                validated_data['longitude'] = location_data['longitude']
            
            # Auto-fill country and city if not provided by frontend
            if not validated_data.get('country') and location_data['country']:
                validated_data['country'] = location_data['country']
            if not validated_data.get('city') and location_data['city']:
                validated_data['city'] = location_data['city']
        return validated_data

    def build_pending_registration_data(self, validated_data):
        validated_data = dict(validated_data)
        validated_data = self._enrich_location_data(validated_data)
        validated_data.pop('password2', None)
        password = validated_data.pop('password')

        return {
            **validated_data,
            "password_hash": make_password(password),
        }

    def create_verified_user_from_pending(self, pending_registration):
        from waitlist.models import WaitlistEntry, ContactedArchive

        user = User(
            email=pending_registration.email,
            username=pending_registration.email.split('@')[0],
            first_name=pending_registration.first_name,
            last_name=pending_registration.last_name,
            birth_date=pending_registration.birth_date,
            gender=pending_registration.gender,
            country=pending_registration.country,
            city=pending_registration.city,
            latitude=pending_registration.latitude,
            longitude=pending_registration.longitude,
            signup_source=pending_registration.signup_source,
            utm_source=pending_registration.utm_source,
            utm_medium=pending_registration.utm_medium,
            utm_campaign=pending_registration.utm_campaign,
            utm_content=pending_registration.utm_content,
            utm_term=pending_registration.utm_term,
            landing_page=pending_registration.landing_page,
            is_verified=True,
        )
        user.password = pending_registration.password_hash

        profile_photo = pending_registration.consume_profile_photo()
        if profile_photo:
            user.profile_photo = profile_photo

        user.save()

        waitlist_entry = WaitlistEntry.objects.filter(email=user.email).first()
        if waitlist_entry:
            ContactedArchive.objects.create(
                first_name=waitlist_entry.first_name,
                last_name=waitlist_entry.last_name,
                email=waitlist_entry.email,
                gender=waitlist_entry.gender,
                reason='registered',
                notes=f"User registered on {date.today()}. Waitlist position: {waitlist_entry.position}"
            )
            waitlist_entry.delete()
            logging.info("Moved waitlist entry to archive for verified user_id=%s", user.id)

        logging.info("Verified user created user_id=%s from pending_registration_id=%s", user.id, pending_registration.id)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        password = attrs.get("password")

        if email and password:
            user = authenticate(self.context.get("request"), username=email, password=password)
            if not user:
                raise AuthenticationFailed("Invalid email or password.")
            if not user.is_active:
                raise AuthenticationFailed("User account is disabled.")
        else:
            raise serializers.ValidationError("Both email and password are required.")

        attrs["email"] = email
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


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Les mots de passe ne correspondent pas."}
            )
        return attrs

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
            "photo_review_required",
            "photo_review_trigger_count",
            "photo_review_reason",
            "bio_review_required",
            "bio_review_trigger_count",
            "bio_review_reason",
        ]
        read_only_fields = ["id", "email", "username"]

    def get_profile_photo_url(self, obj):
        return get_absolute_image_url(obj.profile_photo)

class UserProfileSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'age', 'bio', 'profile_photo',
            'profile_photo_url', 'gender', 'city', 'country', 'height',
            'passions', 'profile_prompts', 'career', 'education', 'hobbies', 'favorite_music',
            'is_online', 'account_type',
            'photo_review_required', 'photo_review_trigger_count', 'photo_review_reason',
            'bio_review_required', 'bio_review_trigger_count', 'bio_review_reason',
        ]
    
    def get_age(self, obj):
        if obj.birth_date:
            today = date.today()
            return today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return None
    
    def get_profile_photo_url(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and hasattr(obj.profile_photo, 'url'):
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None

    def validate_profile_photo(self, value):
        if value:
            return validate_uploaded_image(value)
        return value

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
        image = data.get("image")
        if image:
            validate_uploaded_image(image)
        return data





        

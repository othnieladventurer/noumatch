from rest_framework import serializers
from users.models import User
from block.models import Block
from .serializers import *
from interactions.models import Like, Pass
from matches.models import Match
from report.models import Report
from django.db.models import Q





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







class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    date_joined_formatted = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()
    matches_count = serializers.SerializerMethodField()
    reports_received_count = serializers.SerializerMethodField()
    risk_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'gender', 'is_active', 'is_verified', 'profile_score',
            'profile_photo_url', 'matches_count', 'reports_received_count',
            'risk_status', 'date_joined', 'date_joined_formatted', 'account_type'
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

    def get_date_joined_formatted(self, obj):
        if obj.date_joined:
            return obj.date_joined.strftime("%Y-%m-%d %H:%M")
        return "N/A"

    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            return obj.profile_photo.url
        return None

    def get_matches_count(self, obj):
        return Match.objects.filter(Q(user1=obj) | Q(user2=obj)).count()

    def get_reports_received_count(self, obj):
        return Report.objects.filter(reported_user=obj).count()

    def get_risk_status(self, obj):
        reports = self.get_reports_received_count(obj)
        if reports >= 5:
            return "risky"
        elif reports >= 2:
            return "watch"
        return "safe"







class AdminUserDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    recent_matches = serializers.SerializerMethodField()
    recent_reports = serializers.SerializerMethodField()
    recent_blocks = serializers.SerializerMethodField()
    recent_likes = serializers.SerializerMethodField()
    recent_passes = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'bio', 'birth_date', 'age', 'gender', 'location', 'country', 'city',
            'profile_photo_url', 'is_verified', 'profile_score',
            'account_type', 'height', 'passions', 'career', 'education',
            'hobbies', 'favorite_music', 'last_activity', 'is_online',
            'is_active', 'date_joined',
            'stats', 'recent_matches', 'recent_reports', 'recent_blocks',
            'recent_likes', 'recent_passes'
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            return obj.profile_photo.url
        return None

    def get_age(self, obj):
        if obj.birth_date:
            from datetime import date
            today = date.today()
            return today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return None

    def get_stats(self, obj):
        # Return empty dict for now; you can implement full stats later
        return {}

    def get_recent_matches(self, obj):
        matches = Match.objects.filter(Q(user1=obj) | Q(user2=obj)).order_by('-created_at')[:5]
        return [{'id': m.id, 'with_user': m.user1.email if m.user2 == obj else m.user2.email, 'created_at': m.created_at} for m in matches]

    def get_recent_reports(self, obj):
        reports = Report.objects.filter(reported_user=obj).order_by('-created_at')[:5]
        return [{'id': r.id, 'reporter': r.reporter.email, 'reason': r.get_reason_display(), 'status': r.status, 'created_at': r.created_at} for r in reports]

    def get_recent_blocks(self, obj):
        blocks = Block.objects.filter(blocked=obj).order_by('-created_at')[:5]
        return [{'id': b.id, 'blocker': b.blocker.email, 'created_at': b.created_at} for b in blocks]

    def get_recent_likes(self, obj):
        likes = Like.objects.filter(to_user=obj).order_by('-created_at')[:5]
        return [{'id': l.id, 'from_user': l.from_user.email, 'created_at': l.created_at} for l in likes]

    def get_recent_passes(self, obj):
        passes = Pass.objects.filter(to_user=obj).order_by('-created_at')[:5]
        return [{'id': p.id, 'from_user': p.from_user.email, 'created_at': p.created_at} for p in passes]
















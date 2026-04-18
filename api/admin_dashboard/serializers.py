from rest_framework import serializers
from django.db.models import Q
from django.utils import timezone
from users.models import User
from block.models import Block
from interactions.models import Like, Pass
from matches.models import Match
from report.models import Report
from chat.models import Conversation, Message
from notifications.models import Notification


# ---------- Basic Serializers ----------
class BlockSerializer(serializers.ModelSerializer):
    blocker_email = serializers.EmailField(source='blocker.email')
    blocked_email = serializers.EmailField(source='blocked.email')

    class Meta:
        model = Block
        fields = ['id', 'blocker_email', 'blocked_email', 'created_at']


class MatchSerializer(serializers.ModelSerializer):
    with_user = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = ['id', 'with_user', 'created_at']

    def get_with_user(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            current_user = request.user
            other = obj.user2 if obj.user1 == current_user else obj.user1
            return other.email if other else None
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender_email', 'content', 'read', 'created_at']

    def get_sender_email(self, obj):
        try:
            return obj.sender.email if obj.sender else None
        except Exception:
            return None


class ConversationSerializer(serializers.ModelSerializer):
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'other_participant', 'created_at', 'updated_at', 'last_message_at', 'messages', 'last_message']

    def get_other_participant(self, obj):
        try:
            request = self.context.get('request')
            if request and hasattr(request, 'user'):
                current_user = request.user
                if hasattr(obj, 'get_other_user'):
                    other = obj.get_other_user(current_user)
                    return other.email if other and hasattr(other, 'email') else None
            return None
        except Exception:
            return None

            
    def get_messages(self, obj):
        result = []
        for msg in obj.messages.all().order_by('created_at'):
            try:
                result.append({
                    'id': msg.id,
                    'sender_email': msg.sender.email if msg.sender else None,
                    'content': msg.content,
                    'read': msg.read,
                    'created_at': msg.created_at,
                })
            except Exception:
                continue
        return result

    def get_last_message(self, obj):
        try:
            if hasattr(obj, 'last_message'):
                msg = obj.last_message()
                if msg:
                    return {
                        'sender_email': msg.sender.email if msg.sender else None,
                        'content': msg.content,
                    }
            return None
        except Exception:
            return None


class ReportSerializer(serializers.ModelSerializer):
    reporter_email = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = ['id', 'reporter_email', 'reason', 'status', 'created_at']

    def get_reporter_email(self, obj):
        try:
            return obj.reporter.email if obj.reporter else None
        except Exception:
            return None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'is_read', 'created_at']


# ---------- Admin User List Serializer ----------
class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()
    matches_count = serializers.SerializerMethodField()
    reports_received_count = serializers.SerializerMethodField()
    risk_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'profile_photo_url', 'is_active', 'is_verified', 'profile_score', 'matches_count', 'reports_received_count', 'risk_status', 'date_joined']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

    def get_profile_photo_url(self, obj):
        return obj.profile_photo.url if obj.profile_photo else None

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


# ---------- Admin User Detail Serializer (basic) ----------
class AdminUserDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    recent_matches = serializers.SerializerMethodField()
    recent_reports = serializers.SerializerMethodField()
    recent_blocks = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'profile_photo_url', 'gender', 'age', 'city', 'country', 'bio', 'account_type', 'profile_score', 'is_active', 'is_verified', 'date_joined', 'last_activity', 'stats', 'recent_matches', 'recent_reports', 'recent_blocks']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

    def get_profile_photo_url(self, obj):
        return obj.profile_photo.url if obj.profile_photo else None

    def get_age(self, obj):
        if obj.birth_date:
            from datetime import date
            today = date.today()
            return today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return None

    def get_stats(self, obj):
        try:
            return {
                'total_likes_given': Like.objects.filter(from_user=obj).count(),
                'total_likes_received': Like.objects.filter(to_user=obj).count(),
                'total_passes_given': Pass.objects.filter(from_user=obj).count(),
                'total_passes_received': Pass.objects.filter(to_user=obj).count(),
                'total_matches': Match.objects.filter(Q(user1=obj) | Q(user2=obj)).count(),
                'total_messages_sent': Message.objects.filter(sender=obj).count(),
                'total_blocks_given': Block.objects.filter(blocker=obj).count(),
                'total_blocks_received': Block.objects.filter(blocked=obj).count(),
                'total_reports_received': Report.objects.filter(reported_user=obj).count(),
                'account_age_days': (timezone.now() - obj.date_joined).days,
                'active_matches': Match.objects.filter(Q(user1=obj) | Q(user2=obj), conversation__last_message_at__isnull=False).count(),
                'streak_days': 0,
                'total_messages_received': 0,
                'total_reports_filed': Report.objects.filter(reporter=obj).count(),
            }
        except Exception:
            return {}

    def get_recent_matches(self, obj):
        try:
            matches = Match.objects.filter(Q(user1=obj) | Q(user2=obj)).order_by('-created_at')[:5]
            return [{'id': m.id, 'with_user': (m.user1.email if m.user2 == obj else m.user2.email) if (m.user1 and m.user2) else None, 'created_at': m.created_at} for m in matches]
        except Exception:
            return []

    def get_recent_reports(self, obj):
        try:
            reports = Report.objects.filter(reported_user=obj).order_by('-created_at')[:5]
            return [{'id': r.id, 'reporter': r.reporter.email if r.reporter else None, 'reason': r.reason, 'status': r.status, 'created_at': r.created_at} for r in reports]
        except Exception:
            return []

    def get_recent_blocks(self, obj):
        try:
            blocks = Block.objects.filter(blocker=obj).order_by('-created_at')[:5]
            return [{'id': b.id, 'blocker': b.blocker.email if b.blocker else None, 'created_at': b.created_at} for b in blocks]
        except Exception:
            return []


# ---------- Admin User Full Detail Serializer (used with ?full=true) ----------
class AdminUserFullDetailSerializer(AdminUserDetailSerializer):
    all_matches = serializers.SerializerMethodField()
    blocks_sent = serializers.SerializerMethodField()
    blocks_received = serializers.SerializerMethodField()
    conversations = serializers.SerializerMethodField()
    all_reports_received = serializers.SerializerMethodField()
    all_notifications = serializers.SerializerMethodField()

    class Meta(AdminUserDetailSerializer.Meta):
        fields = AdminUserDetailSerializer.Meta.fields + [
            'all_matches', 'blocks_sent', 'blocks_received', 'conversations',
            'all_reports_received', 'all_notifications'
        ]

    def get_all_matches(self, obj):
        try:
            matches = Match.objects.filter(Q(user1=obj) | Q(user2=obj)).order_by('-created_at')
            return [{'id': m.id, 'with_user': (m.user1.email if m.user2 == obj else m.user2.email) if (m.user1 and m.user2) else None, 'created_at': m.created_at} for m in matches]
        except Exception:
            return []

    def get_blocks_sent(self, obj):
        try:
            return [{'id': b.id, 'blocked_email': b.blocked.email if b.blocked else None, 'created_at': b.created_at} for b in Block.objects.filter(blocker=obj).order_by('-created_at')]
        except Exception:
            return []

    def get_blocks_received(self, obj):
        try:
            return [{'id': b.id, 'blocker_email': b.blocker.email if b.blocker else None, 'created_at': b.created_at} for b in Block.objects.filter(blocked=obj).order_by('-created_at')]
        except Exception:
            return []

    def get_conversations(self, obj):
        result = []
        try:
            conv_qs = Conversation.objects.filter(Q(match__user1=obj) | Q(match__user2=obj)).order_by('-updated_at')
            for conv in conv_qs:
                try:
                    other = conv.get_other_user(obj) if hasattr(conv, 'get_other_user') else None
                    last_msg = conv.last_message() if hasattr(conv, 'last_message') else None
                    messages = []
                    for msg in conv.messages.all().order_by('created_at'):
                        try:
                            messages.append({
                                'id': msg.id,
                                'sender_email': msg.sender.email if msg.sender else None,
                                'content': msg.content,
                                'read': msg.read,
                                'created_at': msg.created_at,
                            })
                        except Exception:
                            continue
                    result.append({
                        'id': conv.id,
                        'other_participant': other.email if other and hasattr(other, 'email') else None,
                        'created_at': conv.created_at,
                        'updated_at': conv.updated_at,
                        'last_message_at': conv.last_message_at,
                        'messages': messages,
                        'last_message': {
                            'sender_email': last_msg.sender.email if last_msg and last_msg.sender else None,
                            'content': last_msg.content,
                        } if last_msg else None
                    })
                except Exception:
                    continue
        except Exception:
            pass
        return result

    def get_all_reports_received(self, obj):
        try:
            return [{'id': r.id, 'reporter_email': r.reporter.email if r.reporter else None, 'reason': r.reason, 'status': r.status, 'created_at': r.created_at} for r in Report.objects.filter(reported_user=obj).order_by('-created_at')]
        except Exception:
            return []

    def get_all_notifications(self, obj):
        try:
            return [{'id': n.id, 'title': n.title, 'message': n.message, 'is_read': n.is_read, 'created_at': n.created_at} for n in Notification.objects.filter(recipient=obj).order_by('-created_at')[:100]]
        except Exception:
            return []



from django.db import models
from django.db.models import Q, Count, Avg, Sum, OuterRef, Subquery, Max
from django.db.models.functions import Lower, TruncDate, TruncWeek
from django.utils import timezone
from datetime import timedelta, datetime
from math import ceil
from urllib import error as urlerror
from urllib import request as urlrequest
from types import SimpleNamespace
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import authenticate
from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from django.shortcuts import get_object_or_404
from django.db import connection, transaction
from django.db import DatabaseError, IntegrityError, OperationalError, ProgrammingError
from django.db.models.deletion import ProtectedError
from django.conf import settings
import logging
import requests

from users.models import FeedVisibilityBoost, OTP, User, UserEngagementScore, UserPhoto, UserStats
from users.scoring import refresh_user_score
from users.visibility import admin_boost_visibility, admin_reduce_visibility, admin_force_inject
from interactions.models import Like, Pass, DailySwipe
from matches.models import Match
from block.models import Block
from report.models import Report
from chat.models import Conversation, Message, SupportConversation, MessageFlag
from chat.serializers import SupportConversationSerializer, MessageSerializer, MessageFlagSerializer
from notifications.models import Notification
from admin_dashboard.models import (
    ProfileImpression,
    ReportCase,
    CaseAssignment,
    CaseActivityLog,
    NotificationEmailTemplate,
    NotificationEmailLog,
)
from admin_dashboard.serializers import NotificationEmailTemplateSerializer, NotificationEmailLogSerializer
from admin_dashboard.services.email_notifications import (
    DEFAULT_NOTIFICATION_EMAIL_TEMPLATES,
    ensure_notification_email_templates,
    notification_email_tables_ready,
    send_test_notification_email,
)
from admin_dashboard.services.ranking import compute_ranking_score
from users.throttles import AdminLoginThrottle
from users.auth_cookies import set_auth_cookies, clear_auth_cookies, get_refresh_token_from_request

try:
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
except Exception:  # pragma: no cover - token blacklist may be disabled in some environments
    BlacklistedToken = None
    OutstandingToken = None

# Waitlist models only (no serializers import – we define them inline)
from waitlist.models import WaitlistEntry, WaitlistStats, ContactedArchive

logger = logging.getLogger(__name__)


def _display_user_name(user):
    if not user:
        return None
    full_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
    return full_name or user.username or user.email


def _model_has_fields(model, field_names):
    try:
        for field_name in field_names:
            model._meta.get_field(field_name)
        return True
    except Exception:
        return False


def _user_photo_review_fields_ready():
    required = {
        "photo_review_required",
        "photo_review_trigger_count",
        "photo_review_reason",
        "photo_review_required_at",
    }
    if not _model_has_fields(User, required):
        return False
    try:
        with connection.cursor() as cursor:
            columns = {
                column.name
                for column in connection.introspection.get_table_description(cursor, User._meta.db_table)
            }
        return required.issubset(columns)
    except Exception:
        logger.exception("Could not verify user photo review column readiness.")
        return False


def _user_bio_review_fields_ready():
    required = {
        "bio_review_required",
        "bio_review_trigger_count",
        "bio_review_reason",
        "bio_review_required_at",
    }
    if not _model_has_fields(User, required):
        return False
    try:
        with connection.cursor() as cursor:
            columns = {
                column.name
                for column in connection.introspection.get_table_description(cursor, User._meta.db_table)
            }
        return required.issubset(columns)
    except Exception:
        logger.exception("Could not verify user bio review column readiness.")
        return False


def _raw_delete_queryset(queryset, deleted_by_model):
    count = queryset.count()
    if count:
        queryset._raw_delete(queryset.db)
    label = queryset.model._meta.label
    deleted_by_model[label] = deleted_by_model.get(label, 0) + count
    return count


def _delete_user_account_graph(user):
    user_id = user.id
    user_email = user.email
    deleted_by_model = {}
    total_deleted = 0

    with transaction.atomic():
        user.groups.clear()
        user.user_permissions.clear()

        match_ids = list(
            Match.objects.filter(Q(user1_id=user_id) | Q(user2_id=user_id))
            .values_list("id", flat=True)
        )
        conversation_ids = list(
            Conversation.objects.filter(match_id__in=match_ids)
            .values_list("id", flat=True)
        )
        support_conversation_ids = list(
            SupportConversation.objects.filter(user_id=user_id)
            .values_list("id", flat=True)
        )
        message_ids = list(
            Message.objects.filter(
                Q(conversation_id__in=conversation_ids)
                | Q(support_conversation_id__in=support_conversation_ids)
                | Q(sender_id=user_id)
            ).values_list("id", flat=True)
        )
        like_ids = list(
            Like.objects.filter(Q(from_user_id=user_id) | Q(to_user_id=user_id))
            .values_list("id", flat=True)
        )
        pass_ids = list(
            Pass.objects.filter(Q(from_user_id=user_id) | Q(to_user_id=user_id))
            .values_list("id", flat=True)
        )
        report_ids = list(
            Report.objects.filter(Q(reporter_id=user_id) | Q(reported_user_id=user_id))
            .values_list("id", flat=True)
        )
        case_ids = list(
            ReportCase.objects.filter(report_id__in=report_ids)
            .values_list("id", flat=True)
        )
        impression_ids = list(
            ProfileImpression.objects.filter(Q(viewer_id=user_id) | Q(viewed_id=user_id))
            .values_list("id", flat=True)
        )

        if OutstandingToken is not None:
            token_ids = list(
                OutstandingToken.objects.filter(user_id=user_id)
                .values_list("id", flat=True)
            )
            if BlacklistedToken is not None and token_ids:
                total_deleted += _raw_delete_queryset(
                    BlacklistedToken.objects.filter(token_id__in=token_ids),
                    deleted_by_model,
                )
            total_deleted += _raw_delete_queryset(
                OutstandingToken.objects.filter(id__in=token_ids),
                deleted_by_model,
            )

        NotificationEmailTemplate.objects.filter(updated_by_id=user_id).update(updated_by=None)
        ReportCase.objects.filter(created_by_id=user_id).update(created_by=None)
        CaseAssignment.objects.filter(assigned_by_id=user_id).update(assigned_by=None)
        SupportConversation.objects.filter(assigned_admin_id=user_id).update(assigned_admin=None)
        Report.objects.filter(match_id__in=match_ids).exclude(id__in=report_ids).update(match=None)

        notification_filter = Q(recipient_id=user_id)
        try:
            content_types = ContentType.objects.get_for_models(
                Like, Pass, Match, Message, Report, ProfileImpression,
                for_concrete_models=False,
            )
            related_content = [
                (content_types.get(Like), like_ids),
                (content_types.get(Pass), pass_ids),
                (content_types.get(Match), match_ids),
                (content_types.get(Message), message_ids),
                (content_types.get(Report), report_ids),
                (content_types.get(ProfileImpression), impression_ids),
            ]
            for content_type, object_ids in related_content:
                if content_type and object_ids:
                    notification_filter |= Q(content_type=content_type, object_id__in=object_ids)
        except Exception:
            logger.warning("Could not build generic notification cleanup filter for user_id=%s", user_id)

        total_deleted += _raw_delete_queryset(Notification.objects.filter(notification_filter), deleted_by_model)
        total_deleted += _raw_delete_queryset(
            NotificationEmailLog.objects.filter(Q(recipient_id=user_id) | Q(recipient_email__iexact=user_email)),
            deleted_by_model,
        )
        total_deleted += _raw_delete_queryset(MessageFlag.objects.filter(message_id__in=message_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(Message.objects.filter(id__in=message_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(CaseAssignment.objects.filter(Q(case_id__in=case_ids) | Q(staff_user_id=user_id)), deleted_by_model)
        total_deleted += _raw_delete_queryset(ReportCase.objects.filter(id__in=case_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(Report.objects.filter(id__in=report_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(SupportConversation.objects.filter(id__in=support_conversation_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(Conversation.objects.filter(id__in=conversation_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(Like.objects.filter(id__in=like_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(Pass.objects.filter(id__in=pass_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(Block.objects.filter(Q(blocker_id=user_id) | Q(blocked_id=user_id)), deleted_by_model)
        total_deleted += _raw_delete_queryset(DailySwipe.objects.filter(user_id=user_id), deleted_by_model)
        total_deleted += _raw_delete_queryset(ProfileImpression.objects.filter(id__in=impression_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(FeedVisibilityBoost.objects.filter(Q(viewer_id=user_id) | Q(target_id=user_id)), deleted_by_model)
        total_deleted += _raw_delete_queryset(Match.objects.filter(id__in=match_ids), deleted_by_model)
        total_deleted += _raw_delete_queryset(LogEntry.objects.filter(user_id=user_id), deleted_by_model)
        total_deleted += _raw_delete_queryset(UserPhoto.objects.filter(user_id=user_id), deleted_by_model)
        total_deleted += _raw_delete_queryset(OTP.objects.filter(user_id=user_id), deleted_by_model)
        total_deleted += _raw_delete_queryset(UserStats.objects.filter(user_id=user_id), deleted_by_model)
        total_deleted += _raw_delete_queryset(UserEngagementScore.objects.filter(user_id=user_id), deleted_by_model)
        total_deleted += _raw_delete_queryset(User.objects.filter(id=user_id), deleted_by_model)

    return total_deleted, deleted_by_model


def _user_display_name(user):
    return f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0]


def _user_location(user):
    return f"{user.city}, {user.country}" if user.city and user.country else user.city or user.country or ""


def _parse_admin_date_window(request=None, *, default_to_today=True):
    today = timezone.localdate()
    date_from_raw = request.GET.get('date_from') if request else None
    date_to_raw = request.GET.get('date_to') if request else None

    def parse_date(value, fallback=None):
        if not value:
            return fallback
        try:
            return datetime.strptime(value, '%Y-%m-%d').date()
        except (TypeError, ValueError):
            return fallback

    date_from = parse_date(date_from_raw, today if default_to_today else None)
    date_to = parse_date(date_to_raw, today if default_to_today else None)

    if date_from and date_to and date_from > date_to:
        date_from, date_to = date_to, date_from

    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(date_from, datetime.min.time()), timezone=tz) if date_from else None
    end_dt = timezone.make_aware(datetime.combine(date_to + timedelta(days=1), datetime.min.time()), timezone=tz) if date_to else None

    return start_dt, end_dt, date_from, date_to


def _filter_interaction_queryset(queryset, request):
    viewer_search = request.GET.get('viewer_email')
    if viewer_search:
        queryset = queryset.filter(
            Q(from_user__email__icontains=viewer_search)
            | Q(from_user__first_name__icontains=viewer_search)
            | Q(from_user__last_name__icontains=viewer_search)
        )

    viewed_search = request.GET.get('viewed_email')
    if viewed_search:
        queryset = queryset.filter(
            Q(to_user__email__icontains=viewed_search)
            | Q(to_user__first_name__icontains=viewed_search)
            | Q(to_user__last_name__icontains=viewed_search)
        )

    start_dt, end_dt, _, _ = _parse_admin_date_window(request, default_to_today=True)
    if start_dt:
        queryset = queryset.filter(created_at__gte=start_dt)
    if end_dt:
        queryset = queryset.filter(created_at__lt=end_dt)

    return queryset


def _interaction_impression_rows(request, limit=500):
    swipe_action = request.GET.get('swipe_action')
    include_likes = swipe_action in (None, '', 'like')
    include_passes = swipe_action in (None, '', 'pass')

    rows = []
    total = 0
    sources = []

    for model, action, label in (
        (Like, 'like', 'like_fallback'),
        (Pass, 'pass', 'pass_fallback'),
    ):
        if action == 'like' and not include_likes:
            continue
        if action == 'pass' and not include_passes:
            continue

        queryset = _filter_interaction_queryset(
            model.objects.select_related('from_user', 'to_user').order_by('-created_at'),
            request,
        )
        total += queryset.count()
        sources.append(label)

        for event in queryset[:limit]:
            viewer = event.from_user
            viewed = event.to_user
            rows.append({
                'id': f'{action}-{event.id}',
                'viewer_email': viewer.email,
                'viewer_name': _user_display_name(viewer),
                'viewer_location': _user_location(viewer),
                'viewed_email': viewed.email,
                'viewed_name': _user_display_name(viewed),
                'viewed_location': _user_location(viewed),
                'timestamp': event.created_at,
                'feed_position': None,
                'ranking_score': None,
                'swipe_action': action,
                'device_type': 'unknown',
                'session_id': 'interaction',
                'source': label,
            })

    rows.sort(key=lambda item: item['timestamp'], reverse=True)
    return rows[:limit], total, sources


def _interaction_ranking_metrics(request=None, *, start_dt=None, end_dt=None, date_from=None, date_to=None):
    like_qs = Like.objects.all()
    pass_qs = Pass.objects.all()
    if request is not None and (start_dt is None and end_dt is None):
        start_dt, end_dt, date_from, date_to = _parse_admin_date_window(request, default_to_today=True)
    if start_dt:
        like_qs = like_qs.filter(created_at__gte=start_dt)
        pass_qs = pass_qs.filter(created_at__gte=start_dt)
    if end_dt:
        like_qs = like_qs.filter(created_at__lt=end_dt)
        pass_qs = pass_qs.filter(created_at__lt=end_dt)

    likes_by_profile = {
        row['to_user_id']: row['count']
        for row in like_qs.values('to_user_id').annotate(count=Count('id'))
    }
    passes_by_profile = {
        row['to_user_id']: row['count']
        for row in pass_qs.values('to_user_id').annotate(count=Count('id'))
    }

    profile_ids = set(likes_by_profile) | set(passes_by_profile)
    total_likes = sum(likes_by_profile.values())
    total_passes = sum(passes_by_profile.values())
    total_events = total_likes + total_passes
    if total_events == 0:
        return None

    users_by_id = User.objects.in_bulk(profile_ids)
    top_profiles = []
    for profile_id in profile_ids:
        likes = likes_by_profile.get(profile_id, 0)
        passes = passes_by_profile.get(profile_id, 0)
        total = likes + passes
        user = users_by_id.get(profile_id)
        top_profiles.append({
            'user_id': profile_id,
            'user_email': user.email if user else 'Deleted user',
            'impressions': total,
            'likes': likes,
            'like_rate': round((likes / total) * 100, 1) if total else 0,
            'avg_position': None,
        })

    top_profiles.sort(key=lambda item: (item['likes'], item['impressions']), reverse=True)

    return {
        'total_impressions': total_events,
        'total_likes_from_impressions': total_likes,
        'total_passes_from_impressions': total_passes,
        'impression_conversion_rate': round((total_likes / total_events) * 100, 1),
        'avg_ranking_score': 0.0,
        'position1_like_rate': 0.0,
        'top_performing_profiles': top_profiles[:10],
        'position_performance': [],
        'generated_at': timezone.now(),
        'date_from': date_from.isoformat() if date_from else None,
        'date_to': date_to.isoformat() if date_to else None,
        'source': 'interactions_fallback',
        'warning': 'No profile impression rows were found for this live window. Showing like/pass interaction analytics for the same date window.',
    }


def _profile_impression_metrics(request=None):
    try:
        start_dt, end_dt, date_from, date_to = _parse_admin_date_window(request, default_to_today=True)
        impression_qs = ProfileImpression.objects.all()
        if start_dt:
            impression_qs = impression_qs.filter(timestamp__gte=start_dt)
        if end_dt:
            impression_qs = impression_qs.filter(timestamp__lt=end_dt)

        total_impressions = impression_qs.count()
        if total_impressions == 0:
            fallback_metrics = _interaction_ranking_metrics(
                request,
                start_dt=start_dt,
                end_dt=end_dt,
                date_from=date_from,
                date_to=date_to,
            )
            if fallback_metrics:
                return fallback_metrics

        total_likes_from_impressions = impression_qs.filter(swipe_action='like').count()
        total_passes_from_impressions = impression_qs.filter(swipe_action='pass').count()

        impression_conversion_rate = (
            round((total_likes_from_impressions / total_impressions) * 100, 1)
            if total_impressions > 0 else 0
        )
        avg_ranking_score = impression_qs.aggregate(avg=Avg('ranking_score'))['avg'] or 0

        pos1_impressions = impression_qs.filter(feed_position=0).count()
        pos1_likes = impression_qs.filter(feed_position=0, swipe_action='like').count()
        position1_like_rate = round((pos1_likes / pos1_impressions) * 100, 1) if pos1_impressions > 0 else 0

        top_profiles = []
        profile_stats = impression_qs.values('viewed__email', 'viewed__id').annotate(
            total_impressions=Count('id'),
            likes=Count('id', filter=Q(swipe_action='like')),
            avg_position=Avg('feed_position'),
        ).filter(total_impressions__gte=1).order_by('-likes', '-total_impressions')[:10]

        for stat in profile_stats:
            total = stat['total_impressions'] or 0
            likes = stat['likes'] or 0
            top_profiles.append({
                'user_id': stat['viewed__id'],
                'user_email': stat['viewed__email'] or 'Deleted user',
                'impressions': total,
                'likes': likes,
                'like_rate': round((likes / total) * 100, 1) if total else 0,
                'avg_position': stat['avg_position'],
            })

        position_performance = []
        for pos in range(15):
            pos_imp = impression_qs.filter(feed_position=pos)
            pos_total = pos_imp.count()
            if pos_total > 0:
                pos_likes = pos_imp.filter(swipe_action='like').count()
                pos_passes = pos_imp.filter(swipe_action='pass').count()
                position_performance.append({
                    'position': pos,
                    'impressions': pos_total,
                    'likes': pos_likes,
                    'passes': pos_passes,
                    'like_rate': round((pos_likes / pos_total) * 100, 1),
                    'pass_rate': round((pos_passes / pos_total) * 100, 1),
                })

        return {
            'total_impressions': total_impressions,
            'total_likes_from_impressions': total_likes_from_impressions,
            'total_passes_from_impressions': total_passes_from_impressions,
            'impression_conversion_rate': impression_conversion_rate,
            'avg_ranking_score': round(avg_ranking_score, 1),
            'position1_like_rate': position1_like_rate,
            'top_performing_profiles': top_profiles,
            'position_performance': position_performance,
            'generated_at': timezone.now(),
            'date_from': date_from.isoformat() if date_from else None,
            'date_to': date_to.isoformat() if date_to else None,
            'source': 'profile_impressions',
        }
    except Exception as exc:
        logger.exception("Profile impression metric aggregation failed: %s", exc)
        fallback = _admin_dashboard_fallback_payload()
        return {
            'total_impressions': fallback['total_impressions'],
            'total_likes_from_impressions': fallback['total_likes_from_impressions'],
            'total_passes_from_impressions': fallback['total_passes_from_impressions'],
            'impression_conversion_rate': fallback['impression_conversion_rate'],
            'avg_ranking_score': fallback['avg_ranking_score'],
            'position1_like_rate': fallback['position1_like_rate'],
            'top_performing_profiles': fallback['top_performing_profiles'],
            'position_performance': fallback['position_performance'],
            'generated_at': timezone.now(),
            'degraded': True,
            'warning': 'Temporary database issue while loading profile impression metrics.',
        }


def _admin_dashboard_fallback_payload():
    registration_counts = {
        'women_registered_count': 0,
        'men_registered_count': 0,
        'other_registered_count': 0,
        'women_registered_ratio': 0.0,
        'men_registered_ratio': 0.0,
        'total_registered_app_users': 0,
        'generated_at': timezone.now(),
    }
    try:
        registration_counts = _registration_balance_payload()
    except Exception:
        logger.exception("Could not compute registration balance for admin dashboard fallback.")

    return {
        'total_users': 0,
        **registration_counts,
        'active_today': 0,
        'likes_today': 0,
        'passes_today': 0,
        'matches_today': 0,
        'match_rate': 0.0,
        'recent_blocks': [],
        'total_impressions': 0,
        'total_likes_from_impressions': 0,
        'total_passes_from_impressions': 0,
        'impression_conversion_rate': 0,
        'avg_ranking_score': 0.0,
        'position1_like_rate': 0,
        'top_performing_profiles': [],
        'position_performance': [],
        'dau': 0,
        'wau': 0,
        'mau': 0,
        'stickiness': 0.0,
        'avg_user_score': 0.0,
        'avg_engagement_score': 0.0,
        'avg_quality_score': 0.0,
        'avg_trust_score': 0.0,
        'avg_points': 0.0,
        'high_scoring_users': 0,
        'top_scored_users': [],
        'zero_match_users_count': 0,
        'avg_matches_per_user': 0.0,
        'degraded': True,
        'warning': 'Temporary issue while loading dashboard analytics.',
    }


def _notification_email_template_fallback_rows():
    fallback_rows = []
    for index, (event_type, defaults) in enumerate(DEFAULT_NOTIFICATION_EMAIL_TEMPLATES.items(), start=1):
        template = NotificationEmailTemplate(
            id=-index,
            event_type=event_type,
            name=defaults.get('name', ''),
            is_enabled=True,
            subject_template=defaults.get('subject_template', ''),
            html_template=defaults.get('html_template', ''),
            text_template=defaults.get('text_template', ''),
            sample_payload=defaults.get('sample_payload') or {},
            from_name=defaults.get('from_name') or 'NouMatch',
            reply_to=defaults.get('reply_to') or '',
            version=1,
        )
        fallback_rows.append(NotificationEmailTemplateSerializer(template).data)
    return fallback_rows


def _paginate_queryset(request, queryset, serializer_class):
    page = max(1, int(request.GET.get('page', 1) or 1))
    page_size = int(request.GET.get('page_size', 10) or 10)
    if page_size not in {10, 25, 50, 100}:
        page_size = 10
    total = queryset.count()
    pages = max(1, ceil(total / page_size)) if total else 1
    if page > pages:
        page = pages
    start = (page - 1) * page_size
    end = start + page_size
    rows = queryset[start:end]
    serializer = serializer_class(rows, many=True)
    return {
        'results': serializer.data,
        'total': total,
        'page': page,
        'page_size': page_size,
        'pages': pages,
    }


def _send_waitlist_invite_via_brevo(entry, subject, body):
    api_key = getattr(settings, "BREVO_API_KEY", "")
    if not api_key:
        raise RuntimeError("BREVO_API_KEY is not configured")

    payload = {
        "sender": {"name": "NouMatch", "email": "no-reply@noumatch.com"},
        "to": [{"email": entry.email, "name": f"{entry.first_name} {entry.last_name}".strip()}],
        "subject": subject,
        "textContent": body,
        "htmlContent": body.replace("\n", "<br/>"),
    }
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }
    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        json=payload,
        headers=headers,
        timeout=15,
    )
    if response.status_code != 201:
        raise RuntimeError(f"Brevo send failed ({response.status_code})")


def _product_users_queryset():
    # Best-effort filtering to keep internal/test accounts out of product analytics.
    test_user_q = (
        Q(email__icontains='test')
        | Q(email__icontains='demo')
        | Q(email__icontains='staging')
        | Q(email__iendswith='@example.com')
    )
    return User.objects.filter(is_active=True, is_staff=False, is_superuser=False).exclude(test_user_q)


def _registered_app_users_queryset():
    # Registration balance should reflect actual app registrations, even in staging datasets.
    return User.objects.filter(is_active=True, is_staff=False, is_superuser=False)


def _registration_balance_payload():
    queryset = _registered_app_users_queryset()
    gender_counts = {
        (row['gender'] or 'unspecified'): row['count']
        for row in queryset.values('gender').annotate(count=Count('id'))
    }
    women_registered_count = gender_counts.get('female', 0)
    men_registered_count = gender_counts.get('male', 0)
    other_registered_count = sum(
        count for gender, count in gender_counts.items()
        if gender not in {'female', 'male'}
    )
    binary_registered_total = women_registered_count + men_registered_count
    return {
        'women_registered_count': women_registered_count,
        'men_registered_count': men_registered_count,
        'other_registered_count': other_registered_count,
        'women_registered_ratio': round((women_registered_count / binary_registered_total) * 100, 1) if binary_registered_total else 0.0,
        'men_registered_ratio': round((men_registered_count / binary_registered_total) * 100, 1) if binary_registered_total else 0.0,
        'total_registered_app_users': queryset.count(),
        'generated_at': timezone.now(),
    }


def _active_users_count_since(start_datetime, end_datetime=None):
    filters = _build_activity_filters(start_datetime, end_datetime, {'login', 'view', 'like', 'message'})

    return _product_users_queryset().filter(filters).distinct().count()


def _build_activity_filters(start_datetime, end_datetime=None, actions=None):
    if not actions:
        actions = {'login', 'view', 'like', 'message'}

    queries = []
    if 'login' in actions:
        if end_datetime is None:
            queries.append(Q(last_login__gte=start_datetime))
        else:
            queries.append(Q(last_login__gte=start_datetime, last_login__lt=end_datetime))

    if 'view' in actions:
        if end_datetime is None:
            queries.append(Q(impressions_made__timestamp__gte=start_datetime))
        else:
            queries.append(Q(impressions_made__timestamp__gte=start_datetime, impressions_made__timestamp__lt=end_datetime))

    if 'like' in actions:
        if end_datetime is None:
            queries.append(Q(likes_sent__created_at__gte=start_datetime))
        else:
            queries.append(Q(likes_sent__created_at__gte=start_datetime, likes_sent__created_at__lt=end_datetime))

    if 'message' in actions:
        if end_datetime is None:
            queries.append(Q(sent_messages__created_at__gte=start_datetime, sent_messages__sender_type='user'))
        else:
            queries.append(
                Q(
                    sent_messages__created_at__gte=start_datetime,
                    sent_messages__created_at__lt=end_datetime,
                    sent_messages__sender_type='user',
                )
            )

    if not queries:
        return Q(pk__in=[])

    combined = queries[0]
    for query in queries[1:]:
        combined |= query
    return combined


# ---------- Admin login ----------
class AdminLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AdminLoginThrottle]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'Email and password required'}, status=400)

        user = authenticate(request, username=email.strip().lower(), password=password)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=401)
        if not user.is_active:
            return Response({'error': 'Account disabled'}, status=403)
        if not user.is_staff:
            return Response({'error': 'Not authorized as staff'}, status=403)

        refresh = RefreshToken.for_user(user)
        response = Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'staff_id': user.id,
            'staff_email': user.email,
        })
        set_auth_cookies(response, str(refresh.access_token), str(refresh), admin=True)
        return response


class AdminTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = get_refresh_token_from_request(request, admin=True)
        if not refresh_token:
            response = Response({'detail': 'Refresh token not provided.'}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(response, admin=True)
            return response

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
            new_access = serializer.validated_data.get("access")
            rotated_refresh = serializer.validated_data.get("refresh")

            auth = JWTAuthentication()
            validated_access = auth.get_validated_token(new_access)
            user = auth.get_user(validated_access)
            if not user.is_staff:
                response = Response({'detail': 'Not authorized as staff'}, status=status.HTTP_403_FORBIDDEN)
                clear_auth_cookies(response, admin=True)
                return response

            response = Response(
                {
                    "access": new_access,
                    "refresh": rotated_refresh or refresh_token,
                },
                status=status.HTTP_200_OK,
            )
            set_auth_cookies(response, new_access, rotated_refresh or refresh_token, admin=True)
            return response
        except Exception:
            response = Response({'detail': 'Invalid refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(response, admin=True)
            return response


# ---------- Admin Users List ----------
class AdminUsersListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            page = int(request.GET.get('page', 1))
            limit = int(request.GET.get('limit', 10))
            search = request.GET.get('search', '').strip()
            status_filter = request.GET.get('status', 'all')
            user_type = (request.GET.get('user_type', 'app') or 'app').strip().lower()
            gender_filter = (request.GET.get('gender', 'all') or 'all').strip().lower()
            sort = (request.GET.get('sort', 'newest') or 'newest').strip().lower()
            if user_type not in {'app', 'admin'}:
                user_type = 'app'
            if gender_filter not in {'all', 'male', 'female'}:
                gender_filter = 'all'
            if sort not in {'newest', 'oldest', 'name_asc', 'name_desc'}:
                sort = 'newest'

            queryset = User.objects.all()
            if user_type == 'admin':
                queryset = queryset.filter(is_staff=True)
            elif user_type == 'app':
                queryset = queryset.filter(is_staff=False, is_superuser=False)

            if search:
                queryset = queryset.filter(
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search) |
                    Q(email__icontains=search)
                )

            if status_filter == 'active':
                queryset = queryset.filter(is_active=True)
            elif status_filter == 'inactive':
                queryset = queryset.filter(is_active=False)
            elif status_filter == 'verified':
                queryset = queryset.filter(is_verified=True)

            if gender_filter != 'all':
                queryset = queryset.filter(gender=gender_filter)

            if sort == 'oldest':
                queryset = queryset.order_by('date_joined')
            elif sort == 'name_asc':
                queryset = queryset.order_by(Lower('first_name'), Lower('last_name'), Lower('email'))
            elif sort == 'name_desc':
                queryset = queryset.order_by(Lower('first_name').desc(), Lower('last_name').desc(), Lower('email').desc())
            else:
                queryset = queryset.order_by('-date_joined')

            photo_review_ready = _user_photo_review_fields_ready()
            bio_review_ready = _user_bio_review_fields_ready()
            user_only_fields = [
                'id', 'email', 'first_name', 'last_name', 'username', 'gender',
                'profile_photo', 'is_active', 'is_staff', 'is_superuser',
                'is_verified', 'profile_score', 'date_joined',
            ]
            if photo_review_ready:
                user_only_fields.extend(['photo_review_required', 'photo_review_trigger_count'])
            if bio_review_ready:
                user_only_fields.extend(['bio_review_required', 'bio_review_trigger_count'])
            queryset = queryset.only(*user_only_fields)

            total = queryset.count()
            start = (page - 1) * limit
            end = start + limit
            paginated_users = list(queryset[start:end])
            user_ids = [user.id for user in paginated_users]

            matches_count_by_user = {user_id: 0 for user_id in user_ids}
            for row in Match.objects.filter(
                Q(user1_id__in=user_ids) | Q(user2_id__in=user_ids)
            ).values('user1_id', 'user2_id'):
                if row['user1_id'] in matches_count_by_user:
                    matches_count_by_user[row['user1_id']] += 1
                if row['user2_id'] in matches_count_by_user:
                    matches_count_by_user[row['user2_id']] += 1

            reports_count_by_user = {
                row['reported_user_id']: row['count']
                for row in Report.objects.filter(reported_user_id__in=user_ids)
                .values('reported_user_id')
                .annotate(count=Count('id'))
            }
            scorecards = {
                card.user_id: card
                for card in UserEngagementScore.objects.filter(user__in=paginated_users)
            }

            data = []
            now = timezone.now()
            for user in paginated_users:
                matches_count = matches_count_by_user.get(user.id, 0)
                reports_received_count = reports_count_by_user.get(user.id, 0)
                risk = 'risky' if reports_received_count >= 5 else 'watch' if reports_received_count >= 2 else 'safe'
                scorecard = scorecards.get(user.id)
                minutes_since_join = (
                    int(max(0, (now - user.date_joined).total_seconds()) // 60)
                    if user.date_joined else None
                )

                data.append({
                    'id': user.id,
                    'email': user.email,
                    'full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                    'username': user.username,
                    'gender': user.gender or '',
                    'profile_photo_url': request.build_absolute_uri(user.profile_photo.url) if user.profile_photo else None,
                    'is_active': user.is_active,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'role': 'superadmin' if user.is_superuser else ('staff' if user.is_staff else 'app_user'),
                    'is_verified': user.is_verified,
                    'photo_review_required': user.photo_review_required if photo_review_ready else False,
                    'photo_review_trigger_count': user.photo_review_trigger_count if photo_review_ready else 0,
                    'bio_review_required': user.bio_review_required if bio_review_ready else False,
                    'bio_review_trigger_count': user.bio_review_trigger_count if bio_review_ready else 0,
                    'profile_score': user.profile_score,
                    'user_score': scorecard.overall_score if scorecard else 0,
                    'total_points': scorecard.total_points if scorecard else 0,
                    'matches_count': matches_count,
                    'reports_received_count': reports_received_count,
                    'risk_status': risk,
                    'date_joined': user.date_joined,
                    'minutes_since_join': minutes_since_join,
                })

            return Response({
                'data': data,
                'total': total,
                'page': page,
                'pages': ceil(total / limit) if limit > 0 else 1,
                'user_type': user_type,
                'gender': gender_filter,
                'sort': sort,
            })
        except DatabaseError as exc:
            logger.exception("AdminUsersListView database error; returning empty payload: %s", exc)
            return Response({
                'data': [],
                'total': 0,
                'page': 1,
                'pages': 1,
                'user_type': (request.GET.get('user_type') or 'app'),
                'degraded': True,
                'warning': 'Temporary database connectivity issue while loading users.',
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("AdminUsersListView unexpected error; returning empty payload: %s", exc)
            return Response({
                'data': [],
                'total': 0,
                'page': 1,
                'pages': 1,
                'user_type': (request.GET.get('user_type') or 'app'),
                'degraded': True,
                'warning': 'Temporary issue while loading users.',
            }, status=status.HTTP_200_OK)


class AdminUsersManagementView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        payload = request.data
        email = (payload.get('email') or '').strip().lower()
        username = (payload.get('username') or '').strip() or email.split('@')[0]
        password = payload.get('password') or ''
        role = (payload.get('role') or 'app_user').strip().lower()
        first_name = (payload.get('first_name') or '').strip()
        last_name = (payload.get('last_name') or '').strip()

        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'User with this email already exists'}, status=400)

        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_active=True,
        )
        if role == 'superadmin':
            user.is_staff = True
            user.is_superuser = True
        elif role == 'staff':
            user.is_staff = True
            user.is_superuser = False
        else:
            user.is_staff = False
            user.is_superuser = False
        user.save(update_fields=['is_staff', 'is_superuser'])
        return Response({'success': True, 'id': user.id}, status=201)

    def patch(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        payload = request.data
        role = payload.get('role')
        is_active = payload.get('is_active')
        first_name = payload.get('first_name')
        last_name = payload.get('last_name')
        username = payload.get('username')
        gender = payload.get('gender')
        account_type = payload.get('account_type')
        is_verified = payload.get('is_verified')
        birth_date = payload.get('birth_date')

        if role is not None:
            role = str(role).strip().lower()
            if role == 'superadmin':
                user.is_staff = True
                user.is_superuser = True
            elif role == 'staff':
                user.is_staff = True
                user.is_superuser = False
            else:
                user.is_staff = False
                user.is_superuser = False
        if is_active is not None:
            user.is_active = bool(is_active)
        if first_name is not None:
            user.first_name = str(first_name).strip()
        if last_name is not None:
            user.last_name = str(last_name).strip()
        if username is not None and str(username).strip():
            user.username = str(username).strip()
        if gender is not None:
            if gender in ('male', 'female', 'other', ''):
                user.gender = gender
        if account_type is not None:
            if account_type in ('free', 'premium', 'god_mode'):
                user.account_type = account_type
        if is_verified is not None:
            user.is_verified = bool(is_verified)
        if birth_date is not None:
            from datetime import date as _date
            try:
                user.birth_date = _date.fromisoformat(birth_date) if birth_date else None
            except (ValueError, TypeError):
                pass

        user.save()
        return Response({'success': True})

    def delete(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        if user.id == request.user.id:
            return Response({'error': 'You cannot delete your own account'}, status=400)
        if user.is_superuser and not request.user.is_superuser:
            return Response({'error': 'Only a super admin can delete another super admin account'}, status=403)

        user_email = user.email
        try:
            deleted_count, deleted_by_model = _delete_user_account_graph(user)
        except ProtectedError as exc:
            logger.warning("Admin user delete blocked for user_id=%s: %s", user_id, exc)
            return Response({
                'error': 'This user is linked to protected records and cannot be deleted safely.',
                'code': 'protected_records',
            }, status=status.HTTP_409_CONFLICT)
        except (OperationalError, ProgrammingError) as exc:
            logger.exception("Admin user delete schema/database readiness failure for user_id=%s: %s", user_id, exc)
            return Response({
                'error': 'User deletion could not run because the database schema is not ready. Run the latest migrations and retry.',
                'code': 'database_schema_not_ready',
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (IntegrityError, DatabaseError) as exc:
            logger.exception("Admin user delete database failure for user_id=%s: %s", user_id, exc)
            return Response({
                'error': 'User deletion failed because related database records could not be removed safely. Nothing was deleted.',
                'code': 'database_delete_failed',
            }, status=status.HTTP_409_CONFLICT)
        except Exception as exc:
            logger.exception("Admin user delete unexpected failure for user_id=%s: %s", user_id, exc)
            return Response({
                'error': 'User deletion failed unexpectedly. The server logged the details for review.',
                'code': 'delete_failed',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'success': True,
            'deleted_email': user_email,
            'deleted_count': deleted_count,
            'deleted_by_model': deleted_by_model,
        })


# ---------- Dashboard ----------
class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            now = timezone.now()
            last_24_hours = now - timedelta(hours=24)
            start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            dau = _active_users_count_since(start_today, now)
            wau = _active_users_count_since(now - timedelta(days=7), now)
            mau = _active_users_count_since(now - timedelta(days=30), now)
            stickiness = (dau / mau) if mau else 0

            total_users = User.objects.filter(is_active=True).count()
            active_today = User.objects.filter(last_activity__gte=last_24_hours).count()
            likes_today = Like.objects.filter(created_at__gte=last_24_hours).count()
            passes_today = Pass.objects.filter(created_at__gte=last_24_hours).count()
            matches_today = Match.objects.filter(created_at__gte=last_24_hours).count()

            total_swipes = likes_today + passes_today
            match_rate = round((matches_today / total_swipes) * 100, 1) if total_swipes > 0 else 0.0

            recent_blocks = Block.objects.filter(created_at__gte=last_24_hours).select_related('blocker', 'blocked').order_by('-created_at')[:10]
            blocks_data = []
            for block in recent_blocks:
                blocker = block.blocker
                blocked = block.blocked
                blocks_data.append({
                    'id': block.id,
                    'blocker_id': blocker.id,
                    'blocker_name': f"{blocker.first_name} {blocker.last_name}".strip() or blocker.email,
                    'blocked_id': blocked.id,
                    'blocked_name': f"{blocked.first_name} {blocked.last_name}".strip() or blocked.email,
                    'created_at': block.created_at,
                })

            impression_metrics = _profile_impression_metrics()

            score_qs = UserEngagementScore.objects.select_related('user')
            score_aggregates = score_qs.aggregate(
                avg_user_score=Avg('overall_score'),
                avg_engagement_score=Avg('engagement_score'),
                avg_quality_score=Avg('quality_score'),
                avg_trust_score=Avg('trust_score'),
                avg_points=Avg('total_points'),
            )
            high_scoring_users = score_qs.filter(overall_score__gte=80).count()
            top_scored_users = [
                {
                    'user_id': item.user_id,
                    'user_email': item.user.email,
                    'full_name': f"{item.user.first_name} {item.user.last_name}".strip() or item.user.email,
                    'overall_score': item.overall_score,
                    'total_points': item.total_points,
                }
                for item in score_qs.order_by('-overall_score', '-total_points')[:10]
            ]

            product_users = _product_users_queryset()
            registration_balance = _registration_balance_payload()
            zero_match_users_count = product_users.filter(
                matches_as_user1__isnull=True,
                matches_as_user2__isnull=True,
            ).count()
            avg_matches_per_user = (
                round((Match.objects.count() * 2) / max(1, product_users.count()), 2)
                if product_users.exists()
                else 0.0
            )

            return Response({
                'total_users': total_users,
                **registration_balance,
                'active_today': active_today,
                'likes_today': likes_today,
                'passes_today': passes_today,
                'matches_today': matches_today,
                'match_rate': match_rate,
                'recent_blocks': blocks_data,
                'total_impressions': impression_metrics['total_impressions'],
                'total_likes_from_impressions': impression_metrics['total_likes_from_impressions'],
                'total_passes_from_impressions': impression_metrics['total_passes_from_impressions'],
                'impression_conversion_rate': impression_metrics['impression_conversion_rate'],
                'avg_ranking_score': impression_metrics['avg_ranking_score'],
                'position1_like_rate': impression_metrics['position1_like_rate'],
                'top_performing_profiles': impression_metrics['top_performing_profiles'],
                'position_performance': impression_metrics['position_performance'],
                'dau': dau,
                'wau': wau,
                'mau': mau,
                'stickiness': round(stickiness, 4),
                'avg_user_score': round(score_aggregates['avg_user_score'] or 0, 1),
                'avg_engagement_score': round(score_aggregates['avg_engagement_score'] or 0, 1),
                'avg_quality_score': round(score_aggregates['avg_quality_score'] or 0, 1),
                'avg_trust_score': round(score_aggregates['avg_trust_score'] or 0, 1),
                'avg_points': round(score_aggregates['avg_points'] or 0, 1),
                'high_scoring_users': high_scoring_users,
                'top_scored_users': top_scored_users,
                'zero_match_users_count': zero_match_users_count,
                'avg_matches_per_user': avg_matches_per_user,
            })
        except Exception as exc:
            logger.exception("AdminDashboardView failed; returning fallback payload: %s", exc)
            return Response(_admin_dashboard_fallback_payload(), status=status.HTTP_200_OK)


class AdminRegistrationBalanceView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            return Response(_registration_balance_payload())
        except DatabaseError as exc:
            logger.exception("AdminRegistrationBalanceView database error; returning fallback payload: %s", exc)
            return Response({
                **_admin_dashboard_fallback_payload(),
                'warning': 'Temporary database connectivity issue while loading registration balance.',
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("AdminRegistrationBalanceView unexpected error; returning fallback payload: %s", exc)
            return Response({
                **_admin_dashboard_fallback_payload(),
                'warning': 'Temporary issue while loading registration balance.',
            }, status=status.HTTP_200_OK)


class AdminActiveUsersMetricsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            now = timezone.now()
            start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            start_yesterday = start_today - timedelta(days=1)

            actions_raw = request.GET.get('actions', '').strip().lower()
            allowed_actions = {'login', 'view', 'like', 'message'}
            selected_actions = (
                {item.strip() for item in actions_raw.split(',') if item.strip() in allowed_actions}
                if actions_raw and actions_raw != 'all'
                else set(allowed_actions)
            )
            if not selected_actions:
                selected_actions = set(allowed_actions)

            def count_active(start_dt, end_dt):
                filters = _build_activity_filters(start_dt, end_dt, selected_actions)
                return product_users.filter(filters).distinct().count()

            product_users = _product_users_queryset()

            dau = count_active(start_today, now)
            yesterday_dau = count_active(start_yesterday, start_today)
            wau = count_active(now - timedelta(days=7), now)
            mau = count_active(now - timedelta(days=30), now)
            stickiness = (dau / mau) if mau else 0

            date_from_raw = request.GET.get('date_from')
            date_to_raw = request.GET.get('date_to')
            default_start_date = (start_today - timedelta(days=13)).date()
            default_end_date = start_today.date()

            try:
                date_from = datetime.strptime(date_from_raw, '%Y-%m-%d').date() if date_from_raw else default_start_date
            except ValueError:
                date_from = default_start_date
            try:
                date_to = datetime.strptime(date_to_raw, '%Y-%m-%d').date() if date_to_raw else default_end_date
            except ValueError:
                date_to = default_end_date

            if date_from > date_to:
                date_from, date_to = date_to, date_from

            max_days = 14
            if (date_to - date_from).days + 1 > max_days:
                date_from = date_to - timedelta(days=max_days - 1)

            series = []
            daily_activity_mix = []
            current_date = date_from
            tz = timezone.get_current_timezone()
            while current_date <= date_to:
                day_start = timezone.make_aware(datetime.combine(current_date, datetime.min.time()), timezone=tz)
                day_end = day_start + timedelta(days=1)
                day_dau = count_active(day_start, day_end)
                day_wau = count_active(day_end - timedelta(days=7), day_end)
                day_mau = count_active(day_end - timedelta(days=30), day_end)
                day_stickiness = (day_dau / day_mau) if day_mau else 0

                series.append({
                    'date': current_date.isoformat(),
                    'dau': day_dau,
                    'wau': day_wau,
                    'mau': day_mau,
                    'stickiness': round(day_stickiness, 4),
                })

                daily_activity_mix.append({
                    'date': current_date.isoformat(),
                    'login': product_users.filter(
                        last_login__gte=day_start,
                        last_login__lt=day_end,
                    ).distinct().count(),
                    'view': product_users.filter(
                        impressions_made__timestamp__gte=day_start,
                        impressions_made__timestamp__lt=day_end,
                    ).distinct().count(),
                    'like': product_users.filter(
                        likes_sent__created_at__gte=day_start,
                        likes_sent__created_at__lt=day_end,
                    ).distinct().count(),
                    'message': product_users.filter(
                        sent_messages__created_at__gte=day_start,
                        sent_messages__created_at__lt=day_end,
                        sent_messages__sender_type='user',
                        sent_messages__conversation__isnull=False,
                    ).distinct().count(),
                })
                current_date += timedelta(days=1)

            tz = timezone.get_current_timezone()
            range_start = timezone.make_aware(datetime.combine(date_from, datetime.min.time()), timezone=tz)
            range_end = timezone.make_aware(datetime.combine(date_to + timedelta(days=1), datetime.min.time()), timezone=tz)

            range_activity_mix = {
            'login': product_users.filter(
                last_login__gte=range_start,
                last_login__lt=range_end,
            ).distinct().count(),
            'view': product_users.filter(
                impressions_made__timestamp__gte=range_start,
                impressions_made__timestamp__lt=range_end,
            ).distinct().count(),
            'like': product_users.filter(
                likes_sent__created_at__gte=range_start,
                likes_sent__created_at__lt=range_end,
            ).distinct().count(),
            'message': product_users.filter(
                sent_messages__created_at__gte=range_start,
                sent_messages__created_at__lt=range_end,
                sent_messages__sender_type='user',
                sent_messages__conversation__isnull=False,
            ).distinct().count(),
            }

            product_user_ids = product_users.values_list('id', flat=True)
            funnel_views = ProfileImpression.objects.filter(
            viewer_id__in=product_user_ids,
            timestamp__gte=range_start,
            timestamp__lt=range_end,
        ).values('viewer_id').distinct().count()
            funnel_likes = Like.objects.filter(
            from_user_id__in=product_user_ids,
            created_at__gte=range_start,
            created_at__lt=range_end,
        ).values('from_user_id').distinct().count()
            funnel_matches = product_users.filter(
            Q(matches_as_user1__created_at__gte=range_start, matches_as_user1__created_at__lt=range_end)
            | Q(matches_as_user2__created_at__gte=range_start, matches_as_user2__created_at__lt=range_end)
        ).distinct().count()
            funnel_messages = Message.objects.filter(
            sender_id__in=product_user_ids,
            sender_type='user',
            conversation__isnull=False,
            created_at__gte=range_start,
            created_at__lt=range_end,
        ).values('sender_id').distinct().count()

            def _conv(current, previous):
                return round((current / previous) * 100, 1) if previous else 0.0

            funnel_steps = [
            {
                'step': 'Views',
                'users': funnel_views,
                'conversion_from_previous': 100.0 if funnel_views else 0.0,
            },
            {
                'step': 'Likes',
                'users': funnel_likes,
                'conversion_from_previous': _conv(funnel_likes, funnel_views),
            },
            {
                'step': 'Matches',
                'users': funnel_matches,
                'conversion_from_previous': _conv(funnel_matches, funnel_likes),
            },
            {
                'step': 'Messages',
                'users': funnel_messages,
                'conversion_from_previous': _conv(funnel_messages, funnel_matches),
            },
            ]

            cohort_users_count = product_users.filter(
                date_joined__gte=range_start,
                date_joined__lt=range_end,
            ).count()
            total_matches_in_range = Match.objects.filter(
                created_at__gte=range_start,
                created_at__lt=range_end,
                user1_id__in=product_user_ids,
                user2_id__in=product_user_ids,
            ).count()

            return Response({
            'dau': dau,
            'wau': wau,
            'mau': mau,
            'stickiness': round(stickiness, 4),
            'yesterday_dau': yesterday_dau,
            'dau_delta': dau - yesterday_dau,
            'actions': sorted(selected_actions),
            'series': series,
            'activity_mix': {
                'range_unique_users': range_activity_mix,
                'daily_unique_users': daily_activity_mix,
            },
            'funnel': {
                'steps': funnel_steps,
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
            },
            'behavior': {
                'time_to_first_like': {'avg_seconds': None, 'median_seconds': None, 'samples': 0},
                'time_to_first_match': {'avg_seconds': None, 'median_seconds': None, 'samples': 0},
                'match_to_message_rate_percent': 0.0,
                'time_match_to_first_message': {'avg_seconds': None, 'median_seconds': None, 'samples': 0},
                'avg_messages_per_started_conversation': 0.0,
                'cohort_users_count': cohort_users_count,
                'matches_in_range_count': total_matches_in_range,
                'matches_with_message_count': 0,
            },
            'date_from': date_from.isoformat(),
            'date_to': date_to.isoformat(),
            })
        except Exception as exc:
            logger.exception("AdminActiveUsersMetricsView failed; returning fallback payload: %s", exc)
            today = timezone.now().date().isoformat()
            fallback_actions = ['login', 'like', 'message', 'view']
            return Response({
                'dau': 0,
                'wau': 0,
                'mau': 0,
                'stickiness': 0.0,
                'yesterday_dau': 0,
                'dau_delta': 0,
                'actions': fallback_actions,
                'series': [],
                'activity_mix': {
                    'range_unique_users': {'login': 0, 'view': 0, 'like': 0, 'message': 0},
                    'daily_unique_users': [],
                },
                'funnel': {'steps': [], 'date_from': today, 'date_to': today},
                'behavior': {
                    'time_to_first_like': {'avg_seconds': None, 'median_seconds': None, 'samples': 0},
                    'time_to_first_match': {'avg_seconds': None, 'median_seconds': None, 'samples': 0},
                    'match_to_message_rate_percent': 0.0,
                    'time_match_to_first_message': {'avg_seconds': None, 'median_seconds': None, 'samples': 0},
                    'avg_messages_per_started_conversation': 0.0,
                    'cohort_users_count': 0,
                    'matches_in_range_count': 0,
                    'matches_with_message_count': 0,
                },
                'date_from': today,
                'date_to': today,
                'degraded': True,
                'warning': 'Temporary database issue while loading active-user metrics.',
            }, status=status.HTTP_200_OK)


class AdminUserScoringRefreshView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        user_id = request.data.get('user_id')
        if user_id:
            user = get_object_or_404(User, id=user_id)
            scorecard = refresh_user_score(user)
            return Response({
                'refreshed': 1,
                'user_id': user.id,
                'overall_score': scorecard.overall_score,
                'total_points': scorecard.total_points,
            })

        refreshed = 0
        for user in User.objects.filter(is_active=True):
            refresh_user_score(user)
            refreshed += 1

        return Response({
            'refreshed': refreshed,
            'message': 'User scores recalculated successfully.',
        })


class AdminAnalyticsRankingView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(_profile_impression_metrics(request))


def _probe_public_url(url, timeout_seconds=8):
    try:
        req = urlrequest.Request(
            url,
            headers={
                "User-Agent": "NouMatchSEOHealthBot/1.0 (+https://noumatch.com)"
            },
        )
        with urlrequest.urlopen(req, timeout=timeout_seconds) as response:
            body = response.read(120000).decode("utf-8", errors="ignore")
            return {
                "ok": 200 <= response.status < 400,
                "status": response.status,
                "body": body,
            }
    except urlerror.HTTPError as exc:
        return {"ok": False, "status": exc.code, "body": ""}
    except Exception:
        return {"ok": False, "status": 0, "body": ""}


class AdminSEOMetricsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        frontend_base = getattr(settings, "FRONTEND_URL", "https://noumatch.com").rstrip("/")

        public_routes = [
            "/",
            "/register",
            "/waitlist",
            "/waitlist/women",
            "/waitlist/men",
            "/privacy",
            "/terms",
        ]

        sitemap_url = f"{frontend_base}/sitemap.xml"
        robots_url = f"{frontend_base}/robots.txt"
        home_url = f"{frontend_base}/"

        sitemap_probe = _probe_public_url(sitemap_url)
        robots_probe = _probe_public_url(robots_url)
        home_probe = _probe_public_url(home_url)

        route_checks = []
        success_count = 0
        for route in public_routes:
            route_probe = _probe_public_url(f"{frontend_base}{route}")
            route_checks.append({
                "route": route,
                "ok": route_probe["ok"],
                "status": route_probe["status"],
            })
            if route_probe["ok"]:
                success_count += 1

        route_health = (success_count / len(public_routes)) if public_routes else 0

        home_html = home_probe["body"]
        has_meta_description = 'name="description"' in home_html
        has_canonical = 'rel="canonical"' in home_html
        has_og = 'property="og:' in home_html
        has_twitter = 'name="twitter:' in home_html
        uses_hash_routes = "/#/" in home_html
        robots_has_sitemap = sitemap_url in robots_probe["body"]
        sitemap_is_xml = "<urlset" in sitemap_probe["body"]

        checks = {
            "sitemap_reachable": sitemap_probe["ok"],
            "sitemap_is_xml": sitemap_is_xml,
            "robots_reachable": robots_probe["ok"],
            "robots_has_sitemap": robots_has_sitemap,
            "homepage_reachable": home_probe["ok"],
            "meta_description_present": has_meta_description,
            "canonical_present": has_canonical,
            "open_graph_present": has_og,
            "twitter_meta_present": has_twitter,
            "hash_routes_detected_in_homepage": uses_hash_routes,
            "route_health_ratio": round(route_health, 4),
        }

        score = 0
        score += 20 if checks["sitemap_reachable"] else 0
        score += 10 if checks["sitemap_is_xml"] else 0
        score += 10 if checks["robots_reachable"] else 0
        score += 10 if checks["robots_has_sitemap"] else 0
        score += 15 if checks["homepage_reachable"] else 0
        score += 10 if checks["meta_description_present"] else 0
        score += 10 if checks["canonical_present"] else 0
        score += 7 if checks["open_graph_present"] else 0
        score += 8 if checks["twitter_meta_present"] else 0
        score += int(round(10 * route_health))
        if checks["hash_routes_detected_in_homepage"]:
            score = max(0, score - 10)

        recommendations = []
        if not checks["sitemap_reachable"]:
            recommendations.append("Publish /sitemap.xml on production and ensure it returns HTTP 200.")
        if checks["sitemap_reachable"] and not checks["sitemap_is_xml"]:
            recommendations.append("Serve valid XML content from /sitemap.xml.")
        if not checks["robots_reachable"]:
            recommendations.append("Publish /robots.txt on production and ensure it returns HTTP 200.")
        if checks["robots_reachable"] and not checks["robots_has_sitemap"]:
            recommendations.append("Add a Sitemap directive in robots.txt pointing to sitemap.xml.")
        if not checks["canonical_present"]:
            recommendations.append("Add canonical URL tag to homepage to avoid duplicate URL signals.")
        if checks["hash_routes_detected_in_homepage"]:
            recommendations.append("Remove hash route URLs from indexable pages and keep clean path URLs.")
        if route_health < 1:
            recommendations.append("Ensure SPA fallback rewrite is active so direct route reloads return HTTP 200.")

        return Response({
            "score": score,
            "frontend_base_url": frontend_base,
            "sitemap_url": sitemap_url,
            "robots_url": robots_url,
            "checks": checks,
            "indexable_routes": public_routes,
            "route_checks": route_checks,
            "recommendations": recommendations,
        })


# ---------- Swipe Stats ----------
class AdminSwipeStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 10))
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)

        daily_data = []
        current = end_date
        while current >= start_date:
            likes = Like.objects.filter(created_at__date=current).count()
            passes = Pass.objects.filter(created_at__date=current).count()
            daily_data.append({
                'date': current.isoformat(),
                'likes': likes,
                'passes': passes,
            })
            current -= timedelta(days=1)

        total_days = len(daily_data)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_days = daily_data[start_idx:end_idx]

        total_likes = Like.objects.count()
        total_passes = Pass.objects.count()
        
        last_24_hours = timezone.now() - timedelta(hours=24)
        today_likes = Like.objects.filter(created_at__gte=last_24_hours).count()
        today_passes = Pass.objects.filter(created_at__gte=last_24_hours).count()

        last_week = end_date - timedelta(days=7)
        top_users = User.objects.filter(
            Q(likes_sent__created_at__date__gte=last_week) |
            Q(passes_sent__created_at__date__gte=last_week)
        ).annotate(
            total_swipes=Count('likes_sent') + Count('passes_sent')
        ).filter(total_swipes__gt=0).order_by('-total_swipes')[:10]

        top_users_data = [
            {
                'name': f"{u.first_name} {u.last_name}".strip() or u.email.split('@')[0],
                'email': u.email,
                'total_swipes': u.total_swipes
            } for u in top_users
        ]

        return Response({
            'daily_data': paginated_days,
            'total_days': total_days,
            'page': page,
            'pages': (total_days + limit - 1) // limit if limit > 0 else 1,
            'total_likes': total_likes,
            'total_passes': total_passes,
            'today_likes': today_likes,
            'today_passes': today_passes,
            'top_users': top_users_data
        })


# ---------- User Detail ----------
class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        photo_review_ready = _user_photo_review_fields_ready()
        bio_review_ready = _user_bio_review_fields_ready()
        user_only_fields = [
            'id', 'email', 'first_name', 'last_name', 'profile_photo', 'gender',
            'city', 'country', 'bio', 'account_type', 'profile_score',
            'is_active', 'is_verified', 'date_joined', 'last_activity',
            'is_online', 'birth_date', 'latitude', 'longitude',
        ]
        if photo_review_ready:
            user_only_fields.extend([
                'photo_review_required',
                'photo_review_trigger_count',
                'photo_review_reason',
                'photo_review_required_at',
            ])
        if bio_review_ready:
            user_only_fields.extend([
                'bio_review_required',
                'bio_review_trigger_count',
                'bio_review_reason',
                'bio_review_required_at',
            ])
        user = get_object_or_404(User.objects.only(*user_only_fields), id=user_id)
        full = request.query_params.get('full') == 'true'
        try:
            scorecard, _ = UserEngagementScore.objects.get_or_create(user=user)
            if not scorecard.last_calculated_at:
                scorecard = refresh_user_score(user)
        except Exception:
            scorecard = None

        response_data = {
            'id': user.id,
            'email': user.email,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'profile_photo_url': request.build_absolute_uri(user.profile_photo.url) if user.profile_photo else None,
            'gender': user.gender,
            'city': user.city,
            'country': user.country,
            'bio': user.bio,
            'account_type': user.account_type,
            'profile_score': user.profile_score,
            'is_active': user.is_active,
            'is_verified': user.is_verified,
            'photo_review_required': user.photo_review_required if photo_review_ready else False,
            'photo_review_trigger_count': user.photo_review_trigger_count if photo_review_ready else 0,
            'photo_review_reason': user.photo_review_reason if photo_review_ready else '',
            'photo_review_required_at': user.photo_review_required_at if photo_review_ready else None,
            'bio_review_required': user.bio_review_required if bio_review_ready else False,
            'bio_review_trigger_count': user.bio_review_trigger_count if bio_review_ready else 0,
            'bio_review_reason': user.bio_review_reason if bio_review_ready else '',
            'bio_review_required_at': user.bio_review_required_at if bio_review_ready else None,
            'date_joined': user.date_joined,
            'last_activity': user.last_activity,
            'is_online': user.is_online,
            'age': (
                timezone.now().date().year - user.birth_date.year
                - (
                    (timezone.now().date().month, timezone.now().date().day)
                    < (user.birth_date.month, user.birth_date.day)
                )
            ) if user.birth_date else None,
            'latitude': float(user.latitude) if user.latitude else None,
            'longitude': float(user.longitude) if user.longitude else None,
            'score': {
                'overall_score': scorecard.overall_score if scorecard else 0,
                'engagement_score': scorecard.engagement_score if scorecard else 0,
                'quality_score': scorecard.quality_score if scorecard else 0,
                'trust_score': scorecard.trust_score if scorecard else 0,
                'profile_completion_percent': scorecard.profile_completion_percent if scorecard else 0,
                'total_points': scorecard.total_points if scorecard else 0,
                'onboarding_points': scorecard.onboarding_points if scorecard else 0,
                'activity_points': scorecard.activity_points if scorecard else 0,
                'quality_points': scorecard.quality_points if scorecard else 0,
                'penalty_points': scorecard.penalty_points if scorecard else 0,
                'allow_perfect_score': scorecard.allow_perfect_score if scorecard else False,
                'score_cap': scorecard.score_cap if scorecard else 99,
                'breakdown': scorecard.breakdown if scorecard else {},
                'last_calculated_at': scorecard.last_calculated_at if scorecard else None,
            },
        }

        response_data['photos'] = [
            {
                'id': photo.id,
                'image_url': request.build_absolute_uri(photo.image.url) if photo.image else None,
                'uploaded_at': photo.uploaded_at,
            }
            for photo in user.photos.all().order_by('-uploaded_at')
            if photo.image
        ]

        # Stats
        likes_given = Like.objects.filter(from_user=user).count()
        likes_received = Like.objects.filter(to_user=user).count()
        passes_given = Pass.objects.filter(from_user=user).count()
        passes_received = Pass.objects.filter(to_user=user).count()
        total_matches = Match.objects.filter(Q(user1=user) | Q(user2=user)).count()
        messages_sent = Message.objects.filter(sender=user).count()
        blocks_given = Block.objects.filter(blocker=user).count()
        blocks_received = Block.objects.filter(blocked=user).count()
        reports_received = Report.objects.filter(reported_user=user).count()
        reports_filed = Report.objects.filter(reporter=user).count()
        account_age_days = (timezone.now() - user.date_joined).days
        user_match_ids = Match.objects.filter(
            Q(user1=user) | Q(user2=user)
        ).values_list('id', flat=True)
        messages_received = Message.objects.filter(
            conversation__match_id__in=user_match_ids,
            sender_type='user',
        ).exclude(sender=user).count()

        response_data['stats'] = {
            'total_likes_given': likes_given,
            'total_likes_received': likes_received,
            'total_passes_given': passes_given,
            'total_passes_received': passes_received,
            'total_matches': total_matches,
            'total_messages_sent': messages_sent,
            'total_blocks_given': blocks_given,
            'total_blocks_received': blocks_received,
            'total_reports_received': reports_received,
            'total_reports_filed': reports_filed,
            'account_age_days': account_age_days,
            'active_matches': total_matches,
            'streak_days': 1 if user.last_activity and (timezone.now() - user.last_activity).days <= 1 else 0,
            'total_messages_received': messages_received,
        }

        # Recent matches
        recent_matches = []
        for m in Match.objects.filter(Q(user1=user) | Q(user2=user)).order_by('-created_at')[:5]:
            other = m.user2 if m.user1 == user else m.user1
            recent_matches.append({'id': m.id, 'with_user': other.email if other else None, 'created_at': m.created_at})
        response_data['recent_matches'] = recent_matches

        # Recent reports
        recent_reports = []
        for r in Report.objects.filter(reported_user=user).order_by('-created_at')[:5]:
            recent_reports.append({'id': r.id, 'reporter': r.reporter.email if r.reporter else None, 'reason': r.reason, 'status': r.status, 'created_at': r.created_at})
        response_data['recent_reports'] = recent_reports

        # Recent blocks
        recent_blocks = []
        for b in Block.objects.filter(blocked=user).order_by('-created_at')[:5]:
            recent_blocks.append({'id': b.id, 'blocker': b.blocker.email if b.blocker else None, 'created_at': b.created_at})
        response_data['recent_blocks'] = recent_blocks

        if full:
            # All matches
            all_matches = []
            for m in Match.objects.filter(Q(user1=user) | Q(user2=user)).order_by('-created_at'):
                other = m.user2 if m.user1 == user else m.user1
                all_matches.append({'id': m.id, 'with_user': other.email if other else None, 'created_at': m.created_at})
            response_data['all_matches'] = all_matches

            # Blocks
            response_data['blocks_sent'] = [{'id': b.id, 'blocked_email': b.blocked.email if b.blocked else None, 'created_at': b.created_at} for b in Block.objects.filter(blocker=user).order_by('-created_at')]
            response_data['blocks_received'] = [{'id': b.id, 'blocker_email': b.blocker.email if b.blocker else None, 'created_at': b.created_at} for b in Block.objects.filter(blocked=user).order_by('-created_at')]

            # Notifications
            response_data['all_notifications'] = [{'id': n.id, 'title': n.title, 'message': n.message[:500] if n.message else '', 'is_read': n.is_read, 'created_at': n.created_at} for n in Notification.objects.filter(recipient=user).order_by('-created_at')[:100]]

        return Response(response_data)


# ---------- Admin actions ----------
class AdminUserActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        user_id = request.data.get('user_id')
        action = str(request.data.get('action') or '').strip().lower()
        if not user_id or not action:
            return Response({'error': 'user_id and action required'}, status=400)

        target = get_object_or_404(User, id=user_id)
        if target.id == request.user.id:
            return Response({'error': 'Cannot act on yourself'}, status=400)

        require_photo_review_actions = {
            'require_photo_review',
            'require_profile_picture',
            'require_profile_photo',
            'require_new_profile_photo',
        }
        clear_photo_review_actions = {
            'clear_photo_review',
            'clear_profile_picture_requirement',
            'clear_profile_photo_requirement',
        }
        require_bio_review_actions = {
            'require_bio_review',
            'require_bio_update',
            'request_bio_update',
            'request_new_bio',
        }
        clear_bio_review_actions = {
            'clear_bio_review',
            'clear_bio_requirement',
            'clear_bio_update_request',
        }
        photo_review_ready = _user_photo_review_fields_ready()
        bio_review_ready = _user_bio_review_fields_ready()

        if action == 'ban':
            target.is_active = False
            target.save()
            return Response({'message': f'User {target.email} banned'})
        elif action == 'unban':
            target.is_active = True
            target.save()
            return Response({'message': f'User {target.email} unbanned'})
        elif action == 'verify':
            target.is_verified = True
            target.save()
            return Response({'message': f'User {target.email} verified'})
        elif action in require_photo_review_actions:
            if not photo_review_ready:
                return Response({
                    'error': 'Photo review moderation fields are not available yet. Run the latest users migrations first.',
                    'code': 'photo_review_schema_not_ready',
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            user_message = (request.data.get('message') or '').strip()
            target.trigger_photo_review_requirement(
                user_message or "Merci d'ajouter une photo recente et conforme a nos regles pour continuer a swiper et eviter une suspension de votre compte NouMatch."
            )
            return Response({
                'message': f'User {target.email} must upload a new profile photo before swiping again',
                'photo_review_required': True,
                'photo_review_trigger_count': target.photo_review_trigger_count,
                'photo_review_reason': target.photo_review_reason,
            })
        elif action in clear_photo_review_actions:
            if not photo_review_ready:
                return Response({
                    'error': 'Photo review moderation fields are not available yet. Run the latest users migrations first.',
                    'code': 'photo_review_schema_not_ready',
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            target.clear_photo_review_requirement()
            return Response({
                'message': f'Photo review requirement cleared for {target.email}',
                'photo_review_required': False,
                'photo_review_trigger_count': target.photo_review_trigger_count,
            })
        elif action in require_bio_review_actions:
            if not bio_review_ready:
                return Response({
                    'error': 'Bio review moderation fields are not available yet. Run the latest users migrations first.',
                    'code': 'bio_review_schema_not_ready',
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            user_message = (request.data.get('message') or '').strip()
            target.trigger_bio_review_requirement(
                user_message or "Merci de mettre a jour votre bio pour continuer a swiper et garder un profil clair et conforme sur NouMatch."
            )
            return Response({
                'message': f'User {target.email} must update their bio before swiping again',
                'bio_review_required': True,
                'bio_review_trigger_count': target.bio_review_trigger_count,
                'bio_review_reason': target.bio_review_reason,
            })
        elif action in clear_bio_review_actions:
            if not bio_review_ready:
                return Response({
                    'error': 'Bio review moderation fields are not available yet. Run the latest users migrations first.',
                    'code': 'bio_review_schema_not_ready',
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            target.clear_bio_review_requirement()
            return Response({
                'message': f'Bio review requirement cleared for {target.email}',
                'bio_review_required': False,
                'bio_review_trigger_count': target.bio_review_trigger_count,
            })
        return Response({'error': 'Invalid action'}, status=400)


class AdminVisibilityActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        user_id = request.data.get('user_id')
        action = (request.data.get('action') or '').strip().lower()
        if not user_id or not action:
            return Response({'error': 'user_id and action required'}, status=400)

        target = get_object_or_404(User, id=user_id)
        if action not in {'boost', 'reduce', 'inject'}:
            return Response({'error': 'Invalid visibility action'}, status=400)

        if action == 'boost':
            affected = admin_boost_visibility(target, limit=20)
        elif action == 'reduce':
            affected = admin_reduce_visibility(target, limit=30)
        else:
            affected = admin_force_inject(target, limit=20)

        return Response({
            'message': f'Visibility action {action} applied',
            'user_id': target.id,
            'action': action,
            'affected_boost_records': affected,
        })


class AdminLaunchMonitorView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            now = timezone.now()
            product_users = _product_users_queryset()
            total_product_users = product_users.count()
            product_user_ids = list(product_users.values_list('id', flat=True))

            matched_user_ids = set(
                Match.objects.filter(
                    Q(user1_id__in=product_user_ids) | Q(user2_id__in=product_user_ids)
                ).values_list('user1_id', flat=True)
            )
            matched_user_ids.update(
                Match.objects.filter(
                    Q(user1_id__in=product_user_ids) | Q(user2_id__in=product_user_ids)
                ).values_list('user2_id', flat=True)
            )

            zero_match_qs = list(
                product_users.exclude(id__in=matched_user_ids)
                .only('id', 'email', 'first_name', 'last_name', 'last_activity', 'date_joined')
                .order_by('-last_activity', '-date_joined')[:50]
            )
            zero_match_ids = [user.id for user in zero_match_qs]
            since_24h = now - timedelta(hours=24)

            impressions_by_user = {
                row['viewed_id']: row['count']
                for row in ProfileImpression.objects.filter(
                    viewed_id__in=zero_match_ids,
                    timestamp__gte=since_24h,
                )
                .values('viewed_id')
                .annotate(count=Count('id'))
            }
            likes_by_user = {
                row['from_user_id']: row['count']
                for row in Like.objects.filter(
                    from_user_id__in=zero_match_ids,
                    created_at__gte=since_24h,
                )
                .values('from_user_id')
                .annotate(count=Count('id'))
            }

            zero_match_users = [
                {
                    'id': user.id,
                    'email': user.email,
                    'full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                    'date_joined': user.date_joined,
                    'last_activity': user.last_activity,
                    'impressions_24h': impressions_by_user.get(user.id, 0),
                    'likes_given_24h': likes_by_user.get(user.id, 0),
                    'minutes_since_join': int((now - user.date_joined).total_seconds() // 60) if user.date_joined else None,
                }
                for user in zero_match_qs
            ]

            total_matches_links = Match.objects.filter(
                Q(user1_id__in=product_user_ids) | Q(user2_id__in=product_user_ids)
            ).count()
            avg_matches_per_user = round(total_matches_links / max(1, total_product_users), 2)

            return Response({
                'total_product_users': total_product_users,
                'zero_match_users_count': max(0, total_product_users - len(matched_user_ids & set(product_user_ids))),
                'avg_matches_per_user': avg_matches_per_user,
                'median_time_to_first_match_seconds': None,
                'zero_match_users': zero_match_users,
                'generated_at': now,
            })
        except DatabaseError as exc:
            logger.exception("AdminLaunchMonitorView database error; returning degraded payload: %s", exc)
            return Response({
                'total_product_users': 0,
                'zero_match_users_count': 0,
                'avg_matches_per_user': 0,
                'median_time_to_first_match_seconds': None,
                'zero_match_users': [],
                'generated_at': timezone.now(),
                'degraded': True,
                'warning': 'Temporary database connectivity issue while loading launch monitor.',
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("AdminLaunchMonitorView unexpected error; returning degraded payload: %s", exc)
            return Response({
                'total_product_users': 0,
                'zero_match_users_count': 0,
                'avg_matches_per_user': 0,
                'median_time_to_first_match_seconds': None,
                'zero_match_users': [],
                'generated_at': timezone.now(),
                'degraded': True,
                'warning': 'Temporary issue while loading launch monitor.',
            }, status=status.HTTP_200_OK)


class AdminBlockUserView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id required'}, status=400)
        user = get_object_or_404(User, id=user_id)
        Block.objects.get_or_create(blocker=request.user, blocked=user)
        return Response({'message': f'User {user.email} blocked by admin'})


class AdminBanUserView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request):
        user_id = request.data.get('user_id')
        user = get_object_or_404(User, id=user_id)
        user.is_active = False
        user.save()
        return Response({'message': f'User {user.email} banned'})


class AdminUnbanUserView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request):
        user_id = request.data.get('user_id')
        user = get_object_or_404(User, id=user_id)
        user.is_active = True
        user.save()
        return Response({'message': f'User {user.email} unbanned'})


class AdminDeactivateUserView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request):
        user_id = request.data.get('user_id')
        user = get_object_or_404(User, id=user_id)
        user.is_active = False
        user.save()
        return Response({'message': f'User {user.email} deactivated'})


def _coerce_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return bool(value)


def _admin_actor_name(user):
    if not user:
        return 'System'
    return f"{user.first_name} {user.last_name}".strip() or user.email


def _append_case_activity(case, event_type, title, *, actor=None, detail='', metadata=None):
    CaseActivityLog.objects.create(
        case=case,
        actor=actor,
        event_type=event_type,
        title=title[:180],
        detail=(detail or '').strip(),
        metadata=metadata or {},
    )


def _sync_report_status_from_case(case):
    report = case.report
    target_status = None

    if case.status in {'open', 'in_progress'} and report.status != 'dismissed':
        target_status = 'investigating'
    elif case.status in {'resolved', 'closed'} and report.status != 'dismissed':
        target_status = 'resolved'

    if target_status and report.status != target_status:
        report.status = target_status
        report.save(update_fields=['status', 'updated_at'])


def _serialize_case_owner(assignment):
    if not assignment:
        return None
    return {
        'id': assignment.staff_user_id,
        'email': assignment.staff_user.email,
        'name': f"{assignment.staff_user.first_name} {assignment.staff_user.last_name}".strip() or assignment.staff_user.email,
        'assigned_at': assignment.assigned_at,
    }


def _serialize_report_summary(report):
    cases = list(report.cases.all())
    active_case = next((case for case in cases if case.status in {'open', 'in_progress'}), None)
    latest_case = cases[0] if cases else None
    reference_case = active_case or latest_case
    active_assignments = []
    current_owner = None

    if reference_case:
        active_assignments = [assignment for assignment in list(reference_case.assignments.all()) if assignment.active]
        current_owner = _serialize_case_owner(active_assignments[0]) if active_assignments else None

    archived = active_case is None and (
        (reference_case and reference_case.status in {'resolved', 'closed'})
        or report.status in {'resolved', 'dismissed'}
    )

    return {
        'id': report.id,
        'reporter_email': report.reporter.email,
        'reporter_name': f"{report.reporter.first_name} {report.reporter.last_name}".strip() or report.reporter.email,
        'reported_user_email': report.reported_user.email,
        'reported_user_name': f"{report.reported_user.first_name} {report.reported_user.last_name}".strip() or report.reported_user.email,
        'reason': report.get_reason_display(),
        'reason_code': report.reason,
        'status': report.status,
        'status_label': report.get_status_display(),
        'created_at': report.created_at,
        'description': report.description,
        'admin_notes': report.admin_notes,
        'action_taken': report.action_taken,
        'has_case': bool(cases),
        'case_count': len(cases),
        'case_id': reference_case.id if reference_case else None,
        'active_case_id': active_case.id if active_case else None,
        'latest_case_status': latest_case.status if latest_case else None,
        'active_case_status': active_case.status if active_case else None,
        'current_owner': current_owner,
        'has_active_case': bool(active_case),
        'requires_case': report.status in {'pending', 'investigating'} and active_case is None,
        'is_new': report.status == 'pending' and not cases,
        'archived': archived,
    }


def _serialize_case_activity_item(activity):
    return {
        'id': activity.id,
        'event_type': activity.event_type,
        'title': activity.title,
        'detail': activity.detail,
        'metadata': activity.metadata or {},
        'actor_id': activity.actor_id,
        'actor_name': _admin_actor_name(activity.actor),
        'created_at': activity.created_at,
    }


def _build_case_activity_timeline(case):
    stored_activity = list(case.activity_logs.select_related('actor').all())
    if stored_activity:
        return [_serialize_case_activity_item(activity) for activity in stored_activity]

    synthetic_items = [{
        'id': f"fallback-open-{case.id}",
        'event_type': 'case_opened',
        'title': 'Case opened',
        'detail': case.title or '',
        'metadata': {},
        'actor_id': case.created_by_id,
        'actor_name': _admin_actor_name(case.created_by),
        'created_at': case.created_at,
    }]

    for assignment in sorted(case.assignments.all(), key=lambda row: row.assigned_at, reverse=True):
        synthetic_items.append({
            'id': f"fallback-assignment-{assignment.id}",
            'event_type': 'owner_assigned' if assignment.active else 'owner_released',
            'title': f"Assigned to {assignment.staff_user.email}" if assignment.active else f"Released from {assignment.staff_user.email}",
            'detail': assignment.notes or '',
            'metadata': {},
            'actor_id': assignment.assigned_by_id,
            'actor_name': _admin_actor_name(assignment.assigned_by),
            'created_at': assignment.assigned_at,
        })

    if case.action_taken:
        synthetic_items.append({
            'id': f"fallback-action-{case.id}",
            'event_type': 'action_recorded',
            'title': 'Action recorded',
            'detail': case.action_taken,
            'metadata': {},
            'actor_id': case.created_by_id,
            'actor_name': _admin_actor_name(case.created_by),
            'created_at': case.updated_at,
        })

    if case.final_note:
        synthetic_items.append({
            'id': f"fallback-note-{case.id}",
            'event_type': 'notes_updated',
            'title': 'Final note added',
            'detail': case.final_note,
            'metadata': {},
            'actor_id': case.created_by_id,
            'actor_name': _admin_actor_name(case.created_by),
            'created_at': case.updated_at,
        })

    if case.closed_at:
        synthetic_items.append({
            'id': f"fallback-close-{case.id}",
            'event_type': 'case_closed',
            'title': 'Case closed',
            'detail': case.close_summary or '',
            'metadata': {},
            'actor_id': case.created_by_id,
            'actor_name': _admin_actor_name(case.created_by),
            'created_at': case.closed_at,
        })

    return sorted(synthetic_items, key=lambda item: item['created_at'], reverse=True)


class AdminReportResolveView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request):
        report_id = request.data.get('report_id')
        report = get_object_or_404(Report, id=report_id)
        report.status = 'resolved'
        report.save()
        return Response({'message': 'Report resolved'})


class AdminReportsListView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        try:
            status_filter = (request.GET.get('status') or '').strip().lower()
            try:
                page = max(1, int(request.GET.get('page', 1)))
            except (TypeError, ValueError):
                page = 1
            try:
                limit = int(request.GET.get('limit', 20))
            except (TypeError, ValueError):
                limit = 20
            limit = min(max(limit, 1), 100)

            case_prefetch = models.Prefetch(
                'cases',
                queryset=ReportCase.objects.select_related(
                    'created_by',
                ).prefetch_related(
                    'assignments__staff_user',
                    'assignments__assigned_by',
                ).order_by('-created_at'),
            )
            queryset = Report.objects.select_related('reporter', 'reported_user').prefetch_related(case_prefetch).order_by('-created_at')
            if not request.user.is_superuser:
                queryset = queryset.filter(
                    cases__assignments__staff_user=request.user,
                    cases__assignments__active=True,
                ).distinct()
            if status_filter and status_filter != 'all':
                queryset = queryset.filter(status=status_filter)

            total = queryset.count()
            start = (page - 1) * limit
            end = start + limit
            reports = queryset[start:end]

            data = [_serialize_report_summary(report) for report in reports]

            return Response({'data': data, 'total': total, 'page': page, 'pages': (total + limit - 1) // limit})
        except DatabaseError as exc:
            logger.exception("AdminReportsListView database error; returning empty payload: %s", exc)
            return Response({
                'data': [],
                'total': 0,
                'page': 1,
                'pages': 1,
                'degraded': True,
                'warning': 'Temporary database connectivity issue while loading reports.',
            }, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            reported_user_id = request.data.get('reported_user_id')
            reason = (request.data.get('reason') or '').strip()
            description = (request.data.get('description') or '').strip()
            if not reported_user_id or not reason:
                return Response({'error': 'reported_user_id and reason are required'}, status=400)

            reported_user = get_object_or_404(User, id=reported_user_id)
            reporter_id = request.data.get('reporter_id')
            if reporter_id and request.user.is_superuser:
                reporter = get_object_or_404(User, id=reporter_id)
            else:
                reporter = request.user

            if reason not in dict(Report.REPORT_REASONS):
                return Response({'error': 'Invalid report reason'}, status=400)

            report = Report.objects.create(
                reporter=reporter,
                reported_user=reported_user,
                match_id=request.data.get('match_id') or None,
                reason=reason,
                description=description,
                status=(request.data.get('status') or 'pending').strip() or 'pending',
                admin_notes=(request.data.get('admin_notes') or '').strip(),
                action_taken=(request.data.get('action_taken') or '').strip(),
            )
            return Response({'success': True, 'report': _serialize_report_summary(report)}, status=201)
        except DatabaseError as exc:
            logger.exception("AdminReportsListView create database error: %s", exc)
            return Response({'error': 'Temporary database issue while creating report.'}, status=503)


class AdminReportDetailView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, pk):
        try:
            case_prefetch = models.Prefetch(
                'cases',
                queryset=ReportCase.objects.select_related(
                    'created_by',
                ).prefetch_related(
                    'assignments__staff_user',
                    'assignments__assigned_by',
                ).order_by('-created_at'),
            )
            report = get_object_or_404(
                Report.objects.select_related('reporter', 'reported_user').prefetch_related(case_prefetch),
                pk=pk,
            )
            if not request.user.is_superuser:
                has_access = CaseAssignment.objects.filter(
                    case__report=report,
                    staff_user=request.user,
                    active=True,
                ).exists()
                if not has_access:
                    return Response({'error': 'Not allowed for this report'}, status=403)
            summary = _serialize_report_summary(report)
            summary.update({
                'screenshot': report.screenshot.url if report.screenshot else None,
                'match_id': report.match_id,
            })
            return Response(summary)
        except DatabaseError as exc:
            logger.exception("AdminReportDetailView database error: %s", exc)
            return Response({'error': 'Temporary database issue while loading report detail.'}, status=503)

    def patch(self, request, pk):
        try:
            report = get_object_or_404(Report, pk=pk)
            payload = request.data

            if 'reported_user_id' in payload:
                report.reported_user = get_object_or_404(User, id=payload.get('reported_user_id'))
            if 'reporter_id' in payload and request.user.is_superuser:
                report.reporter = get_object_or_404(User, id=payload.get('reporter_id'))

            if 'reason' in payload:
                next_reason = (payload.get('reason') or '').strip()
                if next_reason not in dict(Report.REPORT_REASONS):
                    return Response({'error': 'Invalid report reason'}, status=400)
                report.reason = next_reason

            if 'description' in payload:
                report.description = (payload.get('description') or '').strip()
            if 'admin_notes' in payload:
                report.admin_notes = (payload.get('admin_notes') or '').strip()
            if 'action_taken' in payload:
                report.action_taken = (payload.get('action_taken') or '').strip()
            if 'status' in payload:
                next_status = (payload.get('status') or '').strip()
                if next_status not in dict(Report.REPORT_STATUS):
                    return Response({'error': 'Invalid report status'}, status=400)
                report.status = next_status

            report.save()
            refreshed = Report.objects.select_related('reporter', 'reported_user').prefetch_related(
                models.Prefetch(
                    'cases',
                    queryset=ReportCase.objects.select_related('created_by').prefetch_related(
                        'assignments__staff_user',
                        'assignments__assigned_by',
                    ).order_by('-created_at'),
                )
            ).get(id=report.id)
            summary = _serialize_report_summary(refreshed)
            summary.update({
                'screenshot': refreshed.screenshot.url if refreshed.screenshot else None,
                'match_id': refreshed.match_id,
            })
            return Response({'success': True, 'report': summary})
        except DatabaseError as exc:
            logger.exception("AdminReportDetailView update database error: %s", exc)
            return Response({'error': 'Temporary database issue while updating report.'}, status=503)

    def delete(self, request, pk):
        try:
            report = get_object_or_404(Report, pk=pk)
            linked_case_ids = list(ReportCase.objects.filter(report=report).values_list('id', flat=True))
            if linked_case_ids:
                CaseActivityLog.objects.filter(case_id__in=linked_case_ids).delete()
                CaseAssignment.objects.filter(case_id__in=linked_case_ids).delete()
                ReportCase.objects.filter(id__in=linked_case_ids).delete()
            report.delete()
            return Response({'success': True})
        except DatabaseError as exc:
            logger.exception("AdminReportDetailView delete database error: %s", exc)
            return Response({'error': 'Temporary database issue while deleting report.'}, status=503)


class AdminUpdateReportStatusView(APIView):
    permission_classes = [IsAdminUser]
    def patch(self, request, pk):
        report = get_object_or_404(Report, pk=pk)
        new_status = request.data.get('status')
        admin_notes = request.data.get('admin_notes', '')
        action_taken = request.data.get('action_taken', '')

        if new_status in dict(Report.REPORT_STATUS).keys():
            report.status = new_status
        if admin_notes:
            report.admin_notes = admin_notes
        if action_taken:
            report.action_taken = action_taken
        report.save()
        return Response({'message': 'Report updated', 'status': report.status})


class AdminBanUserFromReportView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request):
        report_id = request.data.get('report_id')
        report = get_object_or_404(Report, id=report_id)
        user_to_ban = report.reported_user
        user_to_ban.is_active = False
        user_to_ban.save()
        report.action_taken = f"User {user_to_ban.email} banned. Reason: {report.get_reason_display()}"
        report.status = 'resolved'
        report.save()
        return Response({'message': f'User {user_to_ban.email} banned successfully'})


def _report_case_queryset_for_user(user):
    qs = ReportCase.objects.select_related(
        'report', 'report__reporter', 'report__reported_user', 'created_by'
    ).prefetch_related('assignments__staff_user', 'assignments__assigned_by')
    if user.is_superuser:
        return qs
    return qs.filter(assignments__staff_user=user, assignments__active=True).distinct()


def _serialize_report_case(case):
    active_assignments = [
        assignment for assignment in list(case.assignments.all())
        if assignment.active
    ]
    current_owner = _serialize_case_owner(active_assignments[0]) if active_assignments else None
    return {
        'id': case.id,
        'report_id': case.report_id,
        'report_reason': case.report.get_reason_display() if case.report_id else None,
        'reported_user_email': case.report.reported_user.email if case.report_id else None,
        'reported_user_name': (
            f"{case.report.reported_user.first_name} {case.report.reported_user.last_name}".strip()
            or case.report.reported_user.email
        ) if case.report_id else None,
        'reporter_email': case.report.reporter.email if case.report_id else None,
        'title': case.title,
        'description': case.description,
        'status': case.status,
        'priority': case.priority,
        'department': case.department,
        'final_note': case.final_note,
        'action_taken': case.action_taken,
        'close_summary': case.close_summary,
        'closed_at': case.closed_at,
        'created_by_id': case.created_by_id,
        'created_by_email': case.created_by.email if case.created_by else None,
        'due_at': case.due_at,
        'created_at': case.created_at,
        'updated_at': case.updated_at,
        'assignments_count': len(active_assignments),
        'current_owner': current_owner,
        'report_status': case.report.status if case.report_id else None,
        'archived': case.status in {'resolved', 'closed'} or (case.report.status in {'resolved', 'dismissed'} if case.report_id else False),
        'assigned_staff': [
            {
                'id': assignment.staff_user_id,
                'email': assignment.staff_user.email,
                'name': f"{assignment.staff_user.first_name} {assignment.staff_user.last_name}".strip() or assignment.staff_user.email,
            }
            for assignment in active_assignments
        ],
    }


class AdminReportCasesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            report_id = request.GET.get('report_id')
            status_filter = (request.GET.get('status') or '').strip().lower()
            qs = _report_case_queryset_for_user(request.user)
            if report_id:
                qs = qs.filter(report_id=report_id)
            if status_filter and status_filter != 'all':
                qs = qs.filter(status=status_filter)
            data = [_serialize_report_case(case) for case in qs[:200]]
            return Response({'data': data})
        except DatabaseError as exc:
            logger.exception("AdminReportCasesView database error: %s", exc)
            return Response({
                'data': [],
                'degraded': True,
                'warning': 'Temporary database issue while loading report cases.',
            }, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            report_id = request.data.get('report_id')
            title = (request.data.get('title') or '').strip()
            if not report_id or not title:
                return Response({'error': 'report_id and title are required'}, status=400)
            report = get_object_or_404(Report, id=report_id)
            existing_active_case = ReportCase.objects.filter(report=report, status__in={'open', 'in_progress'}).order_by('-created_at').first()
            if existing_active_case:
                return Response({'error': 'This report already has an active case.'}, status=400)

            status_value = (request.data.get('status') or 'open').strip() or 'open'
            closed_at = timezone.now() if status_value in {'resolved', 'closed'} else None
            staff_user_id = request.data.get('staff_user_id')
            assignment_notes = (request.data.get('assignment_notes') or '').strip()

            if request.user.is_superuser:
                owner_user = get_object_or_404(User, id=staff_user_id, is_staff=True) if staff_user_id else request.user
            else:
                owner_user = request.user

            with transaction.atomic():
                case = ReportCase.objects.create(
                    report=report,
                    title=title,
                    description=(request.data.get('description') or '').strip(),
                    status=status_value,
                    priority=(request.data.get('priority') or 'medium').strip(),
                    department=(request.data.get('department') or 'safety').strip(),
                    final_note=(request.data.get('final_note') or '').strip(),
                    action_taken=(request.data.get('action_taken') or '').strip(),
                    close_summary=(request.data.get('close_summary') or '').strip(),
                    created_by=request.user,
                    due_at=request.data.get('due_at') or None,
                    closed_at=closed_at,
                )
                _append_case_activity(
                    case,
                    'case_opened',
                    f"Case opened for report #{report.id}",
                    actor=request.user,
                    detail=case.description or case.title,
                )

                if owner_user:
                    assignment = CaseAssignment.objects.create(
                        case=case,
                        staff_user=owner_user,
                        assigned_by=request.user,
                        notes=assignment_notes,
                        active=True,
                    )
                    _append_case_activity(
                        case,
                        'owner_assigned',
                        f"Assigned to {_admin_actor_name(owner_user)}",
                        actor=request.user,
                        detail=assignment.notes,
                        metadata={'assignment_id': assignment.id, 'staff_user_id': owner_user.id},
                    )

                if case.action_taken:
                    _append_case_activity(
                        case,
                        'action_recorded',
                        'Action recorded',
                        actor=request.user,
                        detail=case.action_taken,
                    )

                if case.final_note:
                    _append_case_activity(
                        case,
                        'notes_updated',
                        'Final note added',
                        actor=request.user,
                        detail=case.final_note,
                    )

                if case.close_summary:
                    _append_case_activity(
                        case,
                        'closure_updated',
                        'Closure summary added',
                        actor=request.user,
                        detail=case.close_summary,
                    )

                if case.status in {'resolved', 'closed'}:
                    _append_case_activity(
                        case,
                        'case_closed',
                        f"Case moved to {case.get_status_display()}",
                        actor=request.user,
                        detail=case.close_summary or case.final_note,
                    )

                _sync_report_status_from_case(case)

            case = _report_case_queryset_for_user(request.user).get(id=case.id)
            return Response({'success': True, 'id': case.id, 'case': _serialize_report_case(case)}, status=201)
        except DatabaseError as exc:
            logger.exception("AdminReportCasesView create database error: %s", exc)
            return Response({'error': 'Temporary database issue while creating case.'}, status=503)


class AdminReportCaseDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, case_id):
        try:
            case = get_object_or_404(
                ReportCase.objects.select_related('report', 'created_by'),
                id=case_id,
            )
            if not request.user.is_superuser and not CaseAssignment.objects.filter(case=case, staff_user=request.user, active=True).exists():
                return Response({'error': 'Not allowed for this case'}, status=403)
            payload = request.data
            field_changes = {}

            for field in ['title', 'description', 'status', 'priority', 'department']:
                if field in payload:
                    next_value = (payload.get(field) or '').strip()
                    if getattr(case, field) != next_value:
                        field_changes[field] = (getattr(case, field), next_value)
                        setattr(case, field, next_value)
            for field in ['final_note', 'action_taken', 'close_summary']:
                if field in payload:
                    next_value = (payload.get(field) or '').strip()
                    if getattr(case, field) != next_value:
                        field_changes[field] = (getattr(case, field), next_value)
                        setattr(case, field, next_value)
            if 'due_at' in payload:
                next_due_at = payload.get('due_at') or None
                if case.due_at != next_due_at:
                    field_changes['due_at'] = (case.due_at, next_due_at)
                    case.due_at = next_due_at

            if case.status in {'resolved', 'closed'} and case.closed_at is None:
                case.closed_at = timezone.now()
            if case.status not in {'resolved', 'closed'}:
                case.closed_at = None

            with transaction.atomic():
                case.save()

                if 'status' in field_changes:
                    old_status, new_status = field_changes['status']
                    if old_status in {'resolved', 'closed'} and new_status not in {'resolved', 'closed'}:
                        _append_case_activity(
                            case,
                            'case_reopened',
                            f"Reopened as {case.get_status_display()}",
                            actor=request.user,
                        )
                    elif new_status in {'resolved', 'closed'}:
                        _append_case_activity(
                            case,
                            'case_closed',
                            f"Case moved to {case.get_status_display()}",
                            actor=request.user,
                            detail=case.close_summary or case.final_note,
                        )
                    else:
                        previous_label = dict(ReportCase.STATUS_CHOICES).get(old_status, old_status)
                        _append_case_activity(
                            case,
                            'status_changed',
                            f"Status changed to {case.get_status_display()}",
                            actor=request.user,
                            detail=f"From {previous_label}",
                        )

                if 'description' in field_changes and case.description:
                    _append_case_activity(
                        case,
                        'notes_updated',
                        'Investigation notes updated',
                        actor=request.user,
                        detail=case.description,
                    )

                if 'final_note' in field_changes and case.final_note:
                    _append_case_activity(
                        case,
                        'notes_updated',
                        'Final note updated',
                        actor=request.user,
                        detail=case.final_note,
                    )

                if 'action_taken' in field_changes and case.action_taken:
                    _append_case_activity(
                        case,
                        'action_recorded',
                        'Action updated',
                        actor=request.user,
                        detail=case.action_taken,
                    )

                if 'close_summary' in field_changes and case.close_summary:
                    _append_case_activity(
                        case,
                        'closure_updated',
                        'Closure summary updated',
                        actor=request.user,
                        detail=case.close_summary,
                    )

                if any(field in field_changes for field in ['priority', 'department', 'title', 'due_at']):
                    detail_parts = []
                    if 'priority' in field_changes:
                        detail_parts.append(f"Priority: {field_changes['priority'][0]} -> {field_changes['priority'][1]}")
                    if 'department' in field_changes:
                        detail_parts.append(f"Department: {field_changes['department'][0]} -> {field_changes['department'][1]}")
                    if 'title' in field_changes:
                        detail_parts.append('Case title updated')
                    if 'due_at' in field_changes:
                        detail_parts.append('Due date updated')
                    _append_case_activity(
                        case,
                        'notes_updated',
                        'Case details updated',
                        actor=request.user,
                        detail=' | '.join(detail_parts),
                    )

                _sync_report_status_from_case(case)

            case = _report_case_queryset_for_user(request.user).get(id=case.id)
            return Response({'success': True, 'case': _serialize_report_case(case)})
        except DatabaseError as exc:
            logger.exception("AdminReportCaseDetailView update database error: %s", exc)
            return Response({'error': 'Temporary database issue while updating case.'}, status=503)

    def delete(self, request, case_id):
        case = get_object_or_404(ReportCase, id=case_id)
        if not request.user.is_superuser:
          allowed = case.created_by_id == request.user.id or CaseAssignment.objects.filter(case=case, staff_user=request.user, active=True).exists()
          if not allowed:
              return Response({'error': 'Not allowed for this case'}, status=403)
        CaseActivityLog.objects.filter(case=case).delete()
        CaseAssignment.objects.filter(case=case).delete()
        case.delete()
        return Response({'success': True})


class AdminCaseAssignmentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, case_id):
        try:
            case = get_object_or_404(ReportCase, id=case_id)
            if not request.user.is_superuser and not CaseAssignment.objects.filter(case=case, staff_user=request.user, active=True).exists():
                return Response({'error': 'Not allowed for this case'}, status=403)
            assignments = CaseAssignment.objects.filter(case=case).select_related('staff_user', 'assigned_by')
            data = [{
                'id': a.id,
                'case_id': a.case_id,
                'staff_user_id': a.staff_user_id,
                'staff_email': a.staff_user.email,
                'staff_name': f"{a.staff_user.first_name} {a.staff_user.last_name}".strip() or a.staff_user.email,
                'assigned_by_id': a.assigned_by_id,
                'assigned_by_email': a.assigned_by.email if a.assigned_by else None,
                'notes': a.notes,
                'active': a.active,
                'assigned_at': a.assigned_at,
                'updated_at': a.updated_at,
            } for a in assignments]
            return Response({'data': data})
        except DatabaseError as exc:
            logger.exception("AdminCaseAssignmentsView database error: %s", exc)
            return Response({'data': [], 'warning': 'Temporary database issue while loading assignments.'}, status=status.HTTP_200_OK)

    def post(self, request, case_id):
        if not request.user.is_superuser:
            return Response({'error': 'Only superuser can assign cases'}, status=403)
        case = get_object_or_404(ReportCase.objects.select_related('report'), id=case_id)
        staff_user_id = request.data.get('staff_user_id')
        if not staff_user_id:
            return Response({'error': 'staff_user_id is required'}, status=400)
        staff_user = get_object_or_404(User, id=staff_user_id, is_staff=True)
        assignment_active = _coerce_bool(request.data.get('active'), True)
        assignment_notes = (request.data.get('notes') or '').strip()

        with transaction.atomic():
            previous_active_assignments = list(
                CaseAssignment.objects.filter(case=case, active=True).select_related('staff_user')
            )
            if assignment_active:
                CaseAssignment.objects.filter(case=case, active=True).update(active=False)
            assignment = CaseAssignment.objects.create(
                case=case,
                staff_user=staff_user,
                assigned_by=request.user,
                notes=assignment_notes,
                active=assignment_active,
            )

            if assignment_active:
                previous_active_owner = previous_active_assignments[0] if previous_active_assignments else None
                event_type = 'owner_reassigned' if previous_active_owner and previous_active_owner.staff_user_id != staff_user.id else 'owner_assigned'
                title = f"Assigned to {_admin_actor_name(staff_user)}"
                if event_type == 'owner_reassigned':
                    title = f"Reassigned to {_admin_actor_name(staff_user)}"
                _append_case_activity(
                    case,
                    event_type,
                    title,
                    actor=request.user,
                    detail=assignment.notes,
                    metadata={'assignment_id': assignment.id, 'staff_user_id': staff_user.id},
                )
        return Response({'success': True, 'id': assignment.id}, status=201)


class AdminCaseAssignmentDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, assignment_id):
        assignment = get_object_or_404(CaseAssignment.objects.select_related('case', 'staff_user'), id=assignment_id)
        if not request.user.is_superuser and assignment.staff_user_id != request.user.id:
            return Response({'error': 'Not allowed for this assignment'}, status=403)
        payload = request.data
        previous_staff = assignment.staff_user
        previous_active = assignment.active
        previous_notes = assignment.notes
        if 'notes' in payload:
            assignment.notes = (payload.get('notes') or '').strip()
        if 'active' in payload:
            assignment.active = _coerce_bool(payload.get('active'))
        if 'staff_user_id' in payload:
            if not request.user.is_superuser:
                return Response({'error': 'Only superuser can reassign'}, status=403)
            reassigned = get_object_or_404(User, id=payload.get('staff_user_id'), is_staff=True)
            assignment.staff_user = reassigned
        with transaction.atomic():
            if assignment.active:
                CaseAssignment.objects.filter(case=assignment.case, active=True).exclude(id=assignment.id).update(active=False)
            assignment.save()

            if previous_staff.id != assignment.staff_user_id or (not previous_active and assignment.active):
                event_type = 'owner_reassigned' if previous_staff.id != assignment.staff_user_id else 'owner_assigned'
                title = f"Assigned to {_admin_actor_name(assignment.staff_user)}"
                if event_type == 'owner_reassigned':
                    title = f"Reassigned to {_admin_actor_name(assignment.staff_user)}"
                _append_case_activity(
                    assignment.case,
                    event_type,
                    title,
                    actor=request.user,
                    detail=assignment.notes,
                    metadata={'assignment_id': assignment.id, 'staff_user_id': assignment.staff_user_id},
                )
            elif previous_active and not assignment.active:
                _append_case_activity(
                    assignment.case,
                    'owner_released',
                    f"Released {_admin_actor_name(previous_staff)}",
                    actor=request.user,
                    detail=assignment.notes,
                    metadata={'assignment_id': assignment.id, 'staff_user_id': previous_staff.id},
                )
            elif previous_notes != assignment.notes and assignment.notes:
                _append_case_activity(
                    assignment.case,
                    'notes_updated',
                    'Assignment note updated',
                    actor=request.user,
                    detail=assignment.notes,
                    metadata={'assignment_id': assignment.id, 'staff_user_id': assignment.staff_user_id},
                )
        return Response({'success': True})

    def delete(self, request, assignment_id):
        if not request.user.is_superuser:
            return Response({'error': 'Only superuser can delete assignments'}, status=403)
        assignment = get_object_or_404(CaseAssignment.objects.select_related('case', 'staff_user'), id=assignment_id)
        _append_case_activity(
            assignment.case,
            'owner_released',
            f"Removed {_admin_actor_name(assignment.staff_user)}",
            actor=request.user,
            detail=assignment.notes,
            metadata={'assignment_id': assignment.id, 'staff_user_id': assignment.staff_user_id},
        )
        assignment.delete()
        return Response({'success': True})


class AdminCaseActivityView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, case_id):
        try:
            case = get_object_or_404(
                ReportCase.objects.select_related('created_by').prefetch_related(
                    'assignments__staff_user',
                    'assignments__assigned_by',
                    'activity_logs__actor',
                ),
                id=case_id,
            )
            if not request.user.is_superuser and not CaseAssignment.objects.filter(case=case, staff_user=request.user, active=True).exists():
                return Response({'error': 'Not allowed for this case'}, status=403)
            return Response({'data': _build_case_activity_timeline(case)})
        except DatabaseError as exc:
            logger.exception("AdminCaseActivityView database error: %s", exc)
            return Response({
                'data': [],
                'warning': 'Temporary database issue while loading case activity.',
            }, status=status.HTTP_200_OK)


# ---------- Support & Messaging ----------
class AdminSupportConversationListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            status_filter = request.GET.get('status')
            qs = (
                SupportConversation.objects
                .select_related('user', 'assigned_admin')
                .annotate(latest_message_at=Max('messages__created_at'))
                .order_by('-latest_message_at', '-updated_at', '-created_at')
            )
            if status_filter:
                qs = qs.filter(status=status_filter)
            qs = list(qs[:250])
            conversation_ids = [conv.id for conv in qs]
            latest_messages = {}
            for msg in Message.objects.filter(support_conversation_id__in=conversation_ids).order_by('support_conversation_id', '-created_at'):
                latest_messages.setdefault(msg.support_conversation_id, msg)
            data = []
            for conv in qs:
                last_msg = latest_messages.get(conv.id)
                data.append({
                    'id': conv.id,
                    'user': conv.user_id,
                    'user_email': conv.user.email if conv.user_id else None,
                    'user_name': _display_user_name(conv.user) if conv.user_id else None,
                    'user_profile_photo_url': request.build_absolute_uri(conv.user.profile_photo.url) if conv.user_id and conv.user.profile_photo else None,
                    'assigned_admin': conv.assigned_admin_id,
                    'assigned_admin_email': conv.assigned_admin.email if conv.assigned_admin_id else None,
                    'status': conv.status,
                    'created_at': conv.created_at,
                    'updated_at': conv.updated_at,
                    'latest_activity_at': getattr(conv, 'latest_message_at', None) or conv.updated_at or conv.created_at,
                    'unread_count': conv.messages.filter(sender_type='user', read=False).count(),
                    'last_message': None if not last_msg else {
                        'content': last_msg.content,
                        'created_at': last_msg.created_at,
                        'sender_type': last_msg.sender_type,
                        'sender_email': last_msg.sender.email if last_msg.sender_id else None,
                    },
                })
            return Response(data)
        except Exception as exc:
            logger.exception("AdminSupportConversationListView failed; returning empty list: %s", exc)
            return Response([], status=status.HTTP_200_OK)

    def post(self, request):
        user_id = request.data.get('user_id')
        content = (request.data.get('content') or '').strip()
        if not user_id:
            return Response({'error': 'user_id is required'}, status=400)

        user = get_object_or_404(User, id=user_id)
        conversation = (
            SupportConversation.objects
            .filter(user=user, status__in=['open', 'pending'])
            .order_by('-updated_at')
            .first()
        )
        created = False
        if not conversation:
            conversation = SupportConversation.objects.create(
                user=user,
                assigned_admin=request.user,
                status='pending',
            )
            created = True
        else:
            conversation.assigned_admin = request.user
            conversation.status = 'pending'
            conversation.save(update_fields=['assigned_admin', 'status'])

        if content:
            Message.objects.create(
                support_conversation=conversation,
                sender=request.user,
                sender_type='admin',
                content=content,
            )

        serializer = SupportConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class AdminSupportConversationDetailView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, pk):
        conv = get_object_or_404(SupportConversation, pk=pk)
        serializer = SupportConversationSerializer(conv, context={'request': request})
        return Response(serializer.data)


class AdminSupportConversationMessagesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        conv = get_object_or_404(SupportConversation, pk=pk)
        messages = conv.messages.all().order_by('created_at')
        messages.filter(sender_type='user', read=False).update(read=True)
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)


class AdminReplyToSupportView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request, pk):
        conv = get_object_or_404(SupportConversation, pk=pk)
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message content required'}, status=400)
        msg = Message.objects.create(support_conversation=conv, sender=request.user, sender_type='admin', content=content)
        conv.assigned_admin = request.user
        conv.status = 'pending'
        conv.save(update_fields=['assigned_admin', 'status'])
        serializer = MessageSerializer(msg, context={'request': request})
        return Response(serializer.data)


class AdminFlaggedMessagesListView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        qs = MessageFlag.objects.all().order_by('-created_at')
        serializer = MessageFlagSerializer(qs, many=True)
        return Response(serializer.data)


class AdminTakeActionOnFlaggedMessageView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request, pk):
        flag = get_object_or_404(MessageFlag, pk=pk)
        action = request.data.get('action')
        if action == 'ban_user' and flag.message.sender:
            flag.message.sender.is_active = False
            flag.message.sender.save()
        elif action == 'delete_message':
            flag.message.delete()
        flag.delete()
        return Response({'status': f'Action {action} taken'})


class AdminUserConversationsListView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        try:
            convs = list(
                Conversation.objects.select_related('match__user1', 'match__user2')
                .order_by('-updated_at')[:100]
            )
            conversation_ids = [conv.id for conv in convs]
            latest_messages = {}
            for msg in Message.objects.filter(conversation_id__in=conversation_ids).order_by('conversation_id', '-created_at'):
                latest_messages.setdefault(msg.conversation_id, msg)
            data = []
            for c in convs:
                last_msg = latest_messages.get(c.id)
                data.append({
                    'id': c.id,
                    'participants': [c.match.user1.email, c.match.user2.email],
                    'last_message': last_msg.content if last_msg else None,
                    'last_message_at': c.last_message_at,
                    'created_at': c.created_at,
                })
            return Response(data)
        except Exception as exc:
            logger.exception("AdminUserConversationsListView failed; returning empty list: %s", exc)
            return Response([], status=status.HTTP_200_OK)


class AdminUserConversationDetailView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, pk):
        conv = get_object_or_404(Conversation, pk=pk)
        participants = conv.get_participants()
        return Response({
            'id': conv.id,
            'participants': [p.email for p in participants],
            'created_at': conv.created_at,
            'last_message_at': conv.last_message_at,
        })


class AdminUserConversationMessagesView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, pk):
        conv = get_object_or_404(Conversation, pk=pk)
        messages = conv.messages.all().order_by('created_at')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class AdminNotificationEmailTemplatesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if not notification_email_tables_ready():
            return Response({
                'templates': _notification_email_template_fallback_rows(),
                'overview': {
                    'total_logs': 0,
                    'sent_today': 0,
                    'failed_today': 0,
                    'pending_total': 0,
                    'skipped_total': 0,
                    'by_event': {
                        event_type: {'sent': 0, 'failed': 0, 'pending': 0, 'skipped': 0}
                        for event_type in DEFAULT_NOTIFICATION_EMAIL_TEMPLATES.keys()
                    },
                },
                'degraded': True,
                'warning': 'Notification email tables are not available yet. Run the latest admin_dashboard migrations.',
            }, status=status.HTTP_200_OK)

        try:
            ensure_notification_email_templates()
            queryset = NotificationEmailTemplate.objects.select_related('updated_by').order_by('event_type')
            if not queryset.exists():
                return Response({
                    'templates': _notification_email_template_fallback_rows(),
                    'overview': {
                        'total_logs': 0,
                        'sent_today': 0,
                        'failed_today': 0,
                        'pending_total': 0,
                        'skipped_total': 0,
                        'by_event': {
                            event_type: {'sent': 0, 'failed': 0, 'pending': 0, 'skipped': 0}
                            for event_type in DEFAULT_NOTIFICATION_EMAIL_TEMPLATES.keys()
                        },
                    },
                    'degraded': True,
                    'warning': 'Default notification email templates were loaded because no saved templates were found yet.',
                }, status=status.HTTP_200_OK)
            serializer = NotificationEmailTemplateSerializer(queryset, many=True)
            logs = NotificationEmailLog.objects.all()
            today = timezone.now().date()
            return Response({
                'templates': serializer.data,
                'overview': {
                    'total_logs': logs.count(),
                    'sent_today': logs.filter(status='sent', created_at__date=today).count(),
                    'failed_today': logs.filter(status='failed', created_at__date=today).count(),
                    'pending_total': logs.filter(status='pending').count(),
                    'skipped_total': logs.filter(status='skipped').count(),
                    'by_event': {
                        event_type: {
                            'sent': logs.filter(event_type=event_type, status='sent').count(),
                            'failed': logs.filter(event_type=event_type, status='failed').count(),
                            'pending': logs.filter(event_type=event_type, status='pending').count(),
                            'skipped': logs.filter(event_type=event_type, status='skipped').count(),
                        }
                        for event_type in DEFAULT_NOTIFICATION_EMAIL_TEMPLATES.keys()
                    },
                },
            })
        except (ProgrammingError, OperationalError) as exc:
            logger.exception("Admin notification email templates unavailable; returning fallback payload: %s", exc)
            return Response({
                'templates': _notification_email_template_fallback_rows(),
                'overview': {
                    'total_logs': 0,
                    'sent_today': 0,
                    'failed_today': 0,
                    'pending_total': 0,
                    'skipped_total': 0,
                    'by_event': {
                        event_type: {'sent': 0, 'failed': 0, 'pending': 0, 'skipped': 0}
                        for event_type in DEFAULT_NOTIFICATION_EMAIL_TEMPLATES.keys()
                    },
                },
                'degraded': True,
                'warning': 'Notification email data is temporarily unavailable. Run the latest admin_dashboard migrations if this persists.',
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("AdminNotificationEmailTemplatesView failed: %s", exc)
            return Response({'error': 'Failed to load notification email templates.'}, status=500)


class AdminNotificationEmailTemplateDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, template_id):
        if not notification_email_tables_ready():
            return Response({'error': 'Notification email tables are not available yet. Run the latest admin_dashboard migrations.'}, status=503)

        try:
            ensure_notification_email_templates()
            event_type = (request.data.get('event_type') or '').strip()
            if template_id > 0:
                template = get_object_or_404(NotificationEmailTemplate, id=template_id)
            else:
                if event_type not in DEFAULT_NOTIFICATION_EMAIL_TEMPLATES:
                    return Response({'error': 'Valid event_type is required.'}, status=400)
                template, _ = NotificationEmailTemplate.objects.get_or_create(
                    event_type=event_type,
                    defaults=DEFAULT_NOTIFICATION_EMAIL_TEMPLATES[event_type],
                )
            serializer = NotificationEmailTemplateSerializer(template, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            updated = serializer.save(updated_by=request.user, version=template.version + 1)
            return Response(NotificationEmailTemplateSerializer(updated).data)
        except (ProgrammingError, OperationalError) as exc:
            logger.exception("Admin notification email template update unavailable: %s", exc)
            return Response({'error': 'Notification email templates are temporarily unavailable.'}, status=503)


class AdminNotificationEmailLogsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if not notification_email_tables_ready():
            return Response({
                'results': [],
                'total': 0,
                'page': 1,
                'pages': 0,
                'degraded': True,
                'warning': 'Notification email tables are not available yet. Run the latest admin_dashboard migrations.',
            }, status=status.HTTP_200_OK)

        try:
            page = max(1, int(request.GET.get('page', 1) or 1))
            limit = min(100, max(10, int(request.GET.get('limit', 20) or 20)))
            event_type = (request.GET.get('event_type') or '').strip()
            status_filter = (request.GET.get('status') or '').strip()
            search = (request.GET.get('search') or '').strip()

            queryset = NotificationEmailLog.objects.select_related('recipient').all()
            if event_type:
                queryset = queryset.filter(event_type=event_type)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if search:
                queryset = queryset.filter(
                    Q(recipient_email__icontains=search) |
                    Q(subject_rendered__icontains=search)
                )

            total = queryset.count()
            start = (page - 1) * limit
            rows = queryset[start:start + limit]
            serializer = NotificationEmailLogSerializer(rows, many=True)
            return Response({
                'results': serializer.data,
                'total': total,
                'page': page,
                'pages': ceil(total / limit) if limit > 0 else 1,
            })
        except (ProgrammingError, OperationalError) as exc:
            logger.exception("Admin notification email logs unavailable; returning empty payload: %s", exc)
            return Response({
                'results': [],
                'total': 0,
                'page': 1,
                'pages': 0,
                'degraded': True,
                'warning': 'Notification email logs are temporarily unavailable. Run the latest admin_dashboard migrations if this persists.',
            }, status=status.HTTP_200_OK)


class AdminNotificationEmailTestSendView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        event_type = (request.data.get('event_type') or '').strip()
        recipient_email = (request.data.get('recipient_email') or '').strip().lower()
        context_data = request.data.get('sample_payload') or {}
        template_overrides = request.data.get('template_overrides') or {}

        if event_type not in DEFAULT_NOTIFICATION_EMAIL_TEMPLATES:
            return Response({'error': 'Invalid event type'}, status=400)
        if not recipient_email:
            return Response({'error': 'Recipient email is required'}, status=400)
        if not isinstance(context_data, dict):
            return Response({'error': 'Sample payload must be an object'}, status=400)
        if not isinstance(template_overrides, dict):
            return Response({'error': 'Template overrides must be an object'}, status=400)

        try:
            log = send_test_notification_email(
                event_type,
                recipient_email,
                context_data,
                template_overrides=template_overrides,
                metadata={
                    'triggered_by_admin_id': request.user.id,
                    'triggered_by_admin_email': request.user.email,
                },
            )
            return Response({
                'success': True,
                'status': log.status,
                'log_id': log.id,
                'error_message': log.error_message,
                'message': f'Test {event_type} email processed with status: {log.status}',
            })
        except Exception as exc:
            logger.exception("AdminNotificationEmailTestSendView failed: %s", exc)
            return Response({'error': str(exc)}, status=500)


# ---------- Analytics ----------
class LogImpressionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        viewer = request.user
        viewed_id = request.data.get('viewed_user_id')
        feed_position = request.data.get('feed_position')
        ranking_score = request.data.get('ranking_score')
        session_id = request.data.get('session_id')
        device_type = request.data.get('device_type', '')

        if not all([viewed_id, feed_position is not None, ranking_score is not None, session_id]):
            return Response({'error': 'Missing fields'}, status=400)

        try:
            viewed = User.objects.get(id=viewed_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        impression = ProfileImpression.objects.create(
            viewer=viewer, viewed=viewed, feed_position=feed_position,
            ranking_score=ranking_score, session_id=session_id, device_type=device_type
        )
        return Response({'id': impression.id}, status=201)


class UpdateImpressionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        viewer = request.user
        viewed_id = request.data.get('viewed_user_id')
        swipe_action = request.data.get('swipe_action')
        session_id = request.data.get('session_id')

        if not viewed_id or swipe_action not in ['like', 'pass']:
            return Response({'error': 'Invalid data'}, status=400)

        impression = ProfileImpression.objects.filter(
            viewer=viewer, viewed_id=viewed_id, session_id=session_id, was_swiped=False
        ).order_by('-timestamp').first()

        if impression:
            impression.was_swiped = True
            impression.swipe_action = swipe_action
            impression.save()
        else:
            impression = ProfileImpression.objects.create(
                viewer=viewer, viewed_id=viewed_id, feed_position=999,
                ranking_score=0, session_id=session_id, was_swiped=True, swipe_action=swipe_action
            )

        return Response({'status': 'updated'})


class AdminAnalyticsImpressionsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        try:
            queryset = ProfileImpression.objects.select_related('viewer', 'viewed').all().order_by('-timestamp')
            start_dt, end_dt, date_from, date_to = _parse_admin_date_window(request, default_to_today=True)
        
            viewer_search = request.GET.get('viewer_email')
            if viewer_search:
                queryset = queryset.filter(Q(viewer__email__icontains=viewer_search) | Q(viewer__first_name__icontains=viewer_search) | Q(viewer__last_name__icontains=viewer_search))
        
            viewed_search = request.GET.get('viewed_email')
            if viewed_search:
                queryset = queryset.filter(Q(viewed__email__icontains=viewed_search) | Q(viewed__first_name__icontains=viewed_search) | Q(viewed__last_name__icontains=viewed_search))
        
            swipe_action = request.GET.get('swipe_action')
            if swipe_action and swipe_action != '':
                queryset = queryset.filter(swipe_action=swipe_action)

            if start_dt:
                queryset = queryset.filter(timestamp__gte=start_dt)
            if end_dt:
                queryset = queryset.filter(timestamp__lt=end_dt)
        
            total_matching = queryset.count()
            queryset = queryset[:500]
        
            data = []
            for imp in queryset:
                viewer = imp.viewer
                viewer_name = f"{viewer.first_name} {viewer.last_name}".strip() or viewer.email.split('@')[0]
                viewer_location = f"{viewer.city}, {viewer.country}" if viewer.city and viewer.country else viewer.city or viewer.country or ""
            
                viewed = imp.viewed
                viewed_name = f"{viewed.first_name} {viewed.last_name}".strip() or viewed.email.split('@')[0]
                viewed_location = f"{viewed.city}, {viewed.country}" if viewed.city and viewed.country else viewed.city or viewed.country or ""
            
                data.append({
                    'id': imp.id,
                    'viewer_email': viewer.email,
                    'viewer_name': viewer_name,
                    'viewer_location': viewer_location,
                    'viewed_email': viewed.email,
                    'viewed_name': viewed_name,
                    'viewed_location': viewed_location,
                    'timestamp': imp.timestamp,
                    'feed_position': imp.feed_position,
                    'ranking_score': imp.ranking_score,
                    'swipe_action': imp.swipe_action or 'none',
                    'device_type': imp.device_type or 'unknown',
                    'session_id': imp.session_id[:8] if imp.session_id else '',
                })
        
            payload = {
                'data': data,
                'total': total_matching,
                'limited_to': 500,
                'generated_at': timezone.now(),
                'date_from': date_from.isoformat() if date_from else None,
                'date_to': date_to.isoformat() if date_to else None,
                'source': 'profile_impressions',
            }
            if not data:
                fallback_rows, fallback_total, fallback_sources = _interaction_impression_rows(request)
                if fallback_rows:
                    data = fallback_rows
                    total_matching = fallback_total
                    payload['data'] = data
                    payload['total'] = total_matching
                    payload['source'] = 'interactions_fallback'
                    payload['sources'] = fallback_sources
                    payload['warning'] = 'No matching profile impression rows were found for this live window. Showing like/pass interaction records for the same date window.'

            if total_matching > 500 and 'warning' not in payload:
                payload['warning'] = 'Showing the latest 500 impressions. Use filters to narrow the result.'
            return Response(payload)
        except Exception as exc:
            logger.exception("AdminAnalyticsImpressionsView failed; returning degraded payload: %s", exc)
            return Response({
                'data': [],
                'total': 0,
                'limited_to': 500,
                'generated_at': timezone.now(),
                'degraded': True,
                'warning': 'Temporary database issue while loading profile impressions.',
            }, status=status.HTTP_200_OK)


# ==================== WAITLIST ADMIN VIEWS (with inline serializers) ====================

# Inline serializers to avoid import issues
from rest_framework import serializers as drf_serializers

class InlineWaitlistEntrySerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = WaitlistEntry
        fields = ['id', 'first_name', 'last_name', 'email', 'gender', 'position', 'joined_at', 'is_accepted', 'accepted_at']
        read_only_fields = ['id', 'position', 'joined_at']

class InlineContactedArchiveSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = ContactedArchive
        fields = '__all__'


class AdminWaitlistStatsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        try:
            stats = WaitlistStats.get_current_stats()
            data = {
                'total_waiting': stats.total_men_waiting + stats.total_women_waiting,
                'women_waiting': stats.total_women_waiting,
                'men_waiting': stats.total_men_waiting,
                'women_accepted': stats.total_women_accepted,
                'men_accepted': stats.total_men_accepted,
                'target_ratio': {
                    'women': stats.target_women_percentage,
                    'men': stats.target_men_percentage,
                }
            }
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminWaitlistWaitingView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Only show entries that have not already been contacted/invited.
        entries = WaitlistEntry.objects.filter(is_accepted=False, contacted=False).order_by('joined_at')
        return Response(_paginate_queryset(request, entries, InlineWaitlistEntrySerializer))


class AdminWaitlistAcceptedView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        entries = WaitlistEntry.objects.filter(is_accepted=True, contacted=False).order_by('-accepted_at')
        return Response(_paginate_queryset(request, entries, InlineWaitlistEntrySerializer))


class AdminWaitlistArchivedView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        try:
            archives = ContactedArchive.objects.all().order_by('-removed_at')
            return Response(_paginate_queryset(request, archives, InlineContactedArchiveSerializer))
        except DatabaseError as exc:
            logger.exception("AdminWaitlistArchivedView database error; returning empty payload: %s", exc)
            return Response({
                'results': [],
                'total': 0,
                'page': 1,
                'page_size': 10,
                'pages': 1,
                'degraded': True,
                'warning': 'Temporary database connectivity issue while loading archive.',
            }, status=status.HTTP_200_OK)


class AdminWaitlistAcceptView(APIView):
    permission_classes = [IsAdminUser]
    
    def post(self, request, entry_id):
        try:
            entry = WaitlistEntry.objects.get(id=entry_id, is_accepted=False)
            entry.is_accepted = True
            entry.accepted_at = timezone.now()
            entry.save()
            stats = WaitlistStats.get_current_stats()
            stats.update_counts()
            return Response({'success': True, 'message': f'{entry.first_name} {entry.last_name} accepted'})
        except WaitlistEntry.DoesNotExist:
            return Response({'error': 'Entry not found or already accepted'}, status=status.HTTP_404_NOT_FOUND)



class AdminWaitlistContactView(APIView):
    permission_classes = [IsAdminUser]
    
    def post(self, request, entry_id):
        try:
            entry = WaitlistEntry.objects.get(id=entry_id, is_accepted=True, contacted=False)
        except WaitlistEntry.DoesNotExist:
            return Response({'error': 'Accepted entry not found'}, status=status.HTTP_404_NOT_FOUND)
        
        notes = request.data.get('notes', '')
        with transaction.atomic():
            ContactedArchive.objects.create(
                first_name=entry.first_name,
                last_name=entry.last_name,
                email=entry.email,
                gender=entry.gender,
                reason='accepted',
                notes=notes
            )
            entry.delete()
            stats = WaitlistStats.get_current_stats()
            stats.update_counts()
        return Response({'success': True, 'message': 'Entry moved to contacted archive'})
    


    

class AdminWaitlistDeleteView(APIView):
    permission_classes = [IsAdminUser]
    
    def delete(self, request, entry_id):
        try:
            entry = WaitlistEntry.objects.get(id=entry_id)
            entry.delete()
            stats = WaitlistStats.get_current_stats()
            stats.update_counts()
            return Response({'success': True})
        except WaitlistEntry.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


class AdminWaitlistArchiveDeleteView(APIView):
    permission_classes = [IsAdminUser]
    
    def delete(self, request, archive_id):
        try:
            archive = ContactedArchive.objects.get(id=archive_id)
            archive.delete()
            return Response({'success': True})
        except ContactedArchive.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        





class AdminWaitlistUpdateView(APIView):
    permission_classes = [IsAdminUser]
    
    def put(self, request, entry_id):
        try:
            entry = WaitlistEntry.objects.get(id=entry_id)
            data = request.data
            entry.first_name = data.get('first_name', entry.first_name)
            entry.last_name = data.get('last_name', entry.last_name)
            entry.email = data.get('email', entry.email)
            entry.gender = data.get('gender', entry.gender)
            entry.save()
            return Response({'success': True})
        except WaitlistEntry.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


def _select_waitlist_campaign_entries(batch_size=20, women_ratio=55):
    batch_size = max(1, min(int(batch_size or 20), 500))
    women_ratio = max(0, min(int(women_ratio or 55), 100))
    men_ratio = 100 - women_ratio

    women_target = round((women_ratio / 100) * batch_size)
    men_target = batch_size - women_target

    women_qs = WaitlistEntry.objects.filter(
        is_accepted=True,
        contacted=False,
        gender='female',
    ).order_by('accepted_at', 'joined_at')
    men_qs = WaitlistEntry.objects.filter(
        is_accepted=True,
        contacted=False,
        gender='male',
    ).order_by('accepted_at', 'joined_at')

    selected_women = list(women_qs[:women_target])
    selected_men = list(men_qs[:men_target])

    selected = selected_women + selected_men
    remaining = batch_size - len(selected)

    if remaining > 0:
        selected_ids = {entry.id for entry in selected}
        fallback_pool = WaitlistEntry.objects.filter(
            is_accepted=True,
            contacted=False,
        ).exclude(id__in=selected_ids).order_by('accepted_at', 'joined_at')[:remaining]
        selected.extend(list(fallback_pool))

    women_count = sum(1 for entry in selected if entry.gender == 'female')
    men_count = sum(1 for entry in selected if entry.gender == 'male')

    return selected, {
        'requested_total': batch_size,
        'selected_total': len(selected),
        'women': women_count,
        'men': men_count,
        'women_ratio_target': women_ratio,
        'men_ratio_target': men_ratio,
        'women_ratio_actual': round((women_count / len(selected)) * 100, 1) if selected else 0.0,
        'men_ratio_actual': round((men_count / len(selected)) * 100, 1) if selected else 0.0,
    }


DEFAULT_WAITLIST_INVITE_SUBJECT = "Invitation officielle NouMatch : votre acces est ouvert"
DEFAULT_WAITLIST_INVITE_BODY = (
    "Bonjour {{first_name}},\n\n"
    "Excellente nouvelle : votre acces NouMatch est maintenant ouvert.\n\n"
    "Vous pouvez creer votre profil ici :\n"
    "{{register_url}}\n\n"
    "NouMatch est en lancement progressif depuis la liste d'attente. "
    "Si vous voyez peu de profils au depart, c'est normal : de nouveaux membres sont ajoutes en continu.\n"
    "Vous pouvez actualiser la page ou revenir un peu plus tard pour decouvrir de nouveaux profils.\n\n"
    "Merci de faire partie des premiers membres de la communaute NouMatch.\n\n"
    "A tres bientot,\n"
    "L'equipe NouMatch"
)


def _render_waitlist_template(template, context):
    rendered = str(template or "")
    for key, value in context.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
    return rendered


def _build_waitlist_invite_message(entry, subject_template=None, body_template=None):
    register_url = f"{getattr(settings, 'FRONTEND_URL', 'https://noumatch.com').rstrip('/')}/register"
    context = {
        'first_name': entry.first_name or '',
        'last_name': entry.last_name or '',
        'full_name': f"{entry.first_name or ''} {entry.last_name or ''}".strip(),
        'email': entry.email or '',
        'register_url': register_url,
    }
    subject = _render_waitlist_template(subject_template or DEFAULT_WAITLIST_INVITE_SUBJECT, context).strip()
    body = _render_waitlist_template(body_template or DEFAULT_WAITLIST_INVITE_BODY, context).strip()
    return subject, body


def _build_waitlist_invite_target(email, first_name='', last_name=''):
    cleaned_email = (email or '').strip().lower()
    if not cleaned_email:
        raise ValueError('recipient_email is required')

    entry = WaitlistEntry.objects.filter(
        email__iexact=cleaned_email,
        is_accepted=True,
        contacted=False,
    ).order_by('-accepted_at', 'joined_at').first()
    if entry:
        return entry, 'accepted_waitlist'

    derived_first_name = (first_name or '').strip()
    if not derived_first_name:
        local_part = cleaned_email.split('@')[0]
        derived_first_name = local_part.replace('.', ' ').replace('_', ' ').strip().title() or 'Membre'

    return SimpleNamespace(
        email=cleaned_email,
        first_name=derived_first_name,
        last_name=(last_name or '').strip(),
        gender='female',
    ), 'manual_email'


class AdminWaitlistCampaignPreviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        invite_mode = (request.GET.get('invite_mode') or 'batch').strip().lower()
        batch_size = request.GET.get('batch_size', 20)
        women_ratio = request.GET.get('women_ratio', 55)
        subject_template = request.GET.get('subject_template')
        body_template = request.GET.get('body_template')

        if invite_mode == 'single':
            try:
                target, source = _build_waitlist_invite_target(
                    request.GET.get('recipient_email'),
                    request.GET.get('recipient_first_name'),
                    request.GET.get('recipient_last_name'),
                )
            except ValueError as exc:
                return Response({'error': str(exc)}, status=400)
            subject, body = _build_waitlist_invite_message(
                target,
                subject_template=subject_template,
                body_template=body_template,
            )
            summary = {
                'requested_total': 1,
                'selected_total': 1,
                'women': 1 if getattr(target, 'gender', '') == 'female' else 0,
                'men': 1 if getattr(target, 'gender', '') == 'male' else 0,
                'women_ratio_target': women_ratio,
                'men_ratio_target': 100 - max(0, min(int(women_ratio or 55), 100)),
                'women_ratio_actual': 100.0 if getattr(target, 'gender', '') == 'female' else 0.0,
                'men_ratio_actual': 100.0 if getattr(target, 'gender', '') == 'male' else 0.0,
            }
            return Response({
                'mode': 'single',
                'users': [],
                'summary': summary,
                'default_templates': {
                    'subject': DEFAULT_WAITLIST_INVITE_SUBJECT,
                    'body': DEFAULT_WAITLIST_INVITE_BODY,
                },
                'preview_email': {
                    'to': target.email,
                    'subject': subject,
                    'body': body,
                },
                'single_target': {
                    'email': target.email,
                    'first_name': target.first_name,
                    'last_name': target.last_name,
                    'source': source,
                },
            })

        selected, summary = _select_waitlist_campaign_entries(batch_size=batch_size, women_ratio=women_ratio)
        serializer = InlineWaitlistEntrySerializer(selected, many=True)
        preview_email = None
        if selected:
            first_entry = selected[0]
            subject, body = _build_waitlist_invite_message(
                first_entry,
                subject_template=subject_template,
                body_template=body_template,
            )
            preview_email = {
                'to': first_entry.email,
                'subject': subject,
                'body': body,
            }
        return Response({
            'mode': 'batch',
            'users': serializer.data,
            'summary': summary,
            'default_templates': {
                'subject': DEFAULT_WAITLIST_INVITE_SUBJECT,
                'body': DEFAULT_WAITLIST_INVITE_BODY,
            },
            'preview_email': preview_email,
        })


class AdminWaitlistCampaignSendInvitesView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        invite_mode = (request.data.get('invite_mode') or 'batch').strip().lower()
        batch_size = request.data.get('batch_size', 20)
        women_ratio = request.data.get('women_ratio', 55)
        subject_template = request.data.get('subject_template')
        body_template = request.data.get('body_template')

        if invite_mode == 'single':
            try:
                target, source = _build_waitlist_invite_target(
                    request.data.get('recipient_email'),
                    request.data.get('recipient_first_name'),
                    request.data.get('recipient_last_name'),
                )
            except ValueError as exc:
                return Response({'error': str(exc)}, status=400)
            subject, body = _build_waitlist_invite_message(
                target,
                subject_template=subject_template,
                body_template=body_template,
            )
            _send_waitlist_invite_via_brevo(target, subject, body)

            if isinstance(target, WaitlistEntry):
                with transaction.atomic():
                    ContactedArchive.objects.create(
                        first_name=target.first_name,
                        last_name=target.last_name,
                        email=target.email,
                        gender=target.gender,
                        reason='accepted',
                        notes='Invited via single-recipient waitlist send',
                    )
                    target.delete()
                stats = WaitlistStats.get_current_stats()
                stats.update_counts()

            return Response({
                'success': True,
                'mode': 'single',
                'summary': {
                    'requested_total': 1,
                    'selected_total': 1,
                },
                'sent_count': 1,
                'failed_count': 0,
                'sent_emails': [target.email],
                'failed': [],
                'source': source,
            })

        selected, summary = _select_waitlist_campaign_entries(batch_size=batch_size, women_ratio=women_ratio)

        sent = []
        failed = []
        for entry in selected:
            subject, body = _build_waitlist_invite_message(
                entry,
                subject_template=subject_template,
                body_template=body_template,
            )
            try:
                _send_waitlist_invite_via_brevo(entry, subject, body)
                with transaction.atomic():
                    ContactedArchive.objects.create(
                        first_name=entry.first_name,
                        last_name=entry.last_name,
                        email=entry.email,
                        gender=entry.gender,
                        reason='accepted',
                        notes='Invited via waitlist campaign',
                    )
                    entry.delete()
                sent.append(entry.email)
            except Exception as exc:
                logger.exception("Failed waitlist campaign invite for %s: %s", entry.email, exc)
                failed.append({'email': entry.email, 'error': str(exc)})

        stats = WaitlistStats.get_current_stats()
        stats.update_counts()

        return Response({
            'success': True,
            'summary': summary,
            'sent_count': len(sent),
            'failed_count': len(failed),
            'sent_emails': sent,
            'failed': failed,
        })


# ─────────────────────────────────────────────────────────────────────────────
# PR4 — Analytics + Interaction List Views
# ─────────────────────────────────────────────────────────────────────────────

class AdminAnalyticsView(APIView):
    """GET /api/noumatch-admin/analytics/ — aggregated platform analytics."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        eight_weeks_ago = now - timedelta(weeks=8)

        # DAU — distinct non-staff users active per day, last 30 days
        dau_qs = (
            User.objects
            .filter(last_activity__gte=thirty_days_ago, is_staff=False)
            .annotate(date=TruncDate('last_activity'))
            .values('date')
            .annotate(count=Count('id', distinct=True))
            .order_by('date')
        )
        dau = [{'date': str(r['date']), 'count': r['count']} for r in dau_qs]

        # Signups — new non-staff users per day, last 30 days
        signups_qs = (
            User.objects
            .filter(date_joined__gte=thirty_days_ago, is_staff=False)
            .annotate(date=TruncDate('date_joined'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        signups = [{'date': str(r['date']), 'count': r['count']} for r in signups_qs]

        # Gender ratio — % split across all active non-staff users
        gender_qs = (
            User.objects
            .filter(is_active=True, is_staff=False)
            .values('gender')
            .annotate(count=Count('id'))
        )
        total_gendered = sum(r['count'] for r in gender_qs) or 1
        gender_map = {(r['gender'] or 'other'): r['count'] for r in gender_qs}
        gender_ratio = {
            'male': round(gender_map.get('male', 0) / total_gendered * 100),
            'female': round(gender_map.get('female', 0) / total_gendered * 100),
        }

        # Match rate per week — matches / (likes * 0.5), last 8 weeks
        matches_by_week = (
            Match.objects
            .filter(created_at__gte=eight_weeks_ago)
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        likes_by_week = (
            Like.objects
            .filter(created_at__gte=eight_weeks_ago)
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        likes_map = {r['week']: r['count'] for r in likes_by_week}
        match_rate = []
        for r in matches_by_week:
            week_label = r['week'].strftime('%G-W%V')
            swipes = likes_map.get(r['week'], 0)
            rate = round(r['count'] / (swipes * 0.5), 2) if swipes else 0.0
            match_rate.append({'week': week_label, 'rate': rate})

        # Message conversion — % of matches where at least one message was sent
        total_matches = Match.objects.count()
        matches_with_msgs = (
            Conversation.objects
            .filter(messages__isnull=False)
            .distinct()
            .count()
        )
        message_conversion = round(matches_with_msgs / total_matches, 2) if total_matches else 0.0

        # Top 8 cities
        top_cities_qs = (
            User.objects
            .filter(is_active=True, is_staff=False)
            .exclude(city='')
            .values('city')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )
        top_cities = [{'city': r['city'], 'count': r['count']} for r in top_cities_qs]

        return Response({
            'dau': dau,
            'signups': signups,
            'gender_ratio': gender_ratio,
            'match_rate': match_rate,
            'message_conversion': message_conversion,
            'top_cities': top_cities,
        })


class AdminInteractionLikesView(APIView):
    """GET /api/noumatch-admin/interactions/likes/ — paginated like events."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        page = max(1, int(request.query_params.get('page', 1)))
        limit = min(50, max(1, int(request.query_params.get('limit', 20))))
        search = request.query_params.get('search', '').strip()

        qs = Like.objects.select_related('from_user', 'to_user').order_by('-created_at')
        if search:
            qs = qs.filter(
                Q(from_user__email__icontains=search)
                | Q(from_user__first_name__icontains=search)
                | Q(from_user__last_name__icontains=search)
                | Q(to_user__email__icontains=search)
                | Q(to_user__first_name__icontains=search)
                | Q(to_user__last_name__icontains=search)
            )

        total = qs.count()
        offset = (page - 1) * limit
        items = list(qs[offset: offset + limit])

        def _mini(u):
            return {
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}".strip() or u.email,
                'email': u.email,
            }

        return Response({
            'count': total,
            'page': page,
            'pages': max(1, (total + limit - 1) // limit),
            'results': [
                {
                    'id': like.id,
                    'from_user': _mini(like.from_user),
                    'to_user': _mini(like.to_user),
                    'type': like.type,
                    'created_at': like.created_at.isoformat(),
                }
                for like in items
            ],
        })


class AdminInteractionMatchesView(APIView):
    """GET /api/noumatch-admin/interactions/matches/ — paginated match events."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        page = max(1, int(request.query_params.get('page', 1)))
        limit = min(50, max(1, int(request.query_params.get('limit', 20))))
        search = request.query_params.get('search', '').strip()

        qs = (
            Match.objects
            .select_related('user1', 'user2')
            .prefetch_related('conversation__messages')
            .order_by('-created_at')
        )
        if search:
            qs = qs.filter(
                Q(user1__email__icontains=search)
                | Q(user1__first_name__icontains=search)
                | Q(user1__last_name__icontains=search)
                | Q(user2__email__icontains=search)
                | Q(user2__first_name__icontains=search)
                | Q(user2__last_name__icontains=search)
            )

        total = qs.count()
        offset = (page - 1) * limit
        items = list(qs[offset: offset + limit])

        def _mini(u):
            return {
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}".strip() or u.email,
                'email': u.email,
            }

        def _has_messages(match):
            try:
                return match.conversation.messages.exists()
            except Exception:
                return False

        return Response({
            'count': total,
            'page': page,
            'pages': max(1, (total + limit - 1) // limit),
            'results': [
                {
                    'id': m.id,
                    'user1': _mini(m.user1),
                    'user2': _mini(m.user2),
                    'has_messages': _has_messages(m),
                    'created_at': m.created_at.isoformat(),
                }
                for m in items
            ],
        })


class AdminInteractionBlocksView(APIView):
    """GET /api/noumatch-admin/interactions/blocks/ — paginated block events."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        page = max(1, int(request.query_params.get('page', 1)))
        limit = min(50, max(1, int(request.query_params.get('limit', 20))))
        search = request.query_params.get('search', '').strip()

        qs = Block.objects.select_related('blocker', 'blocked').order_by('-created_at')
        if search:
            qs = qs.filter(
                Q(blocker__email__icontains=search)
                | Q(blocker__first_name__icontains=search)
                | Q(blocker__last_name__icontains=search)
                | Q(blocked__email__icontains=search)
                | Q(blocked__first_name__icontains=search)
                | Q(blocked__last_name__icontains=search)
            )

        total = qs.count()
        offset = (page - 1) * limit
        items = list(qs[offset: offset + limit])

        def _mini(u):
            return {
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}".strip() or u.email,
                'email': u.email,
            }

        return Response({
            'count': total,
            'page': page,
            'pages': max(1, (total + limit - 1) // limit),
            'results': [
                {
                    'id': b.id,
                    'blocker': _mini(b.blocker),
                    'blocked': _mini(b.blocked),
                    'created_at': b.created_at.isoformat(),
                }
                for b in items
            ],
        })



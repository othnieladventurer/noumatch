from django.db import models
from django.db.models import Q, Count, Avg, Sum, OuterRef, Subquery
from django.utils import timezone
from datetime import timedelta, datetime
from math import ceil
from urllib import error as urlerror
from urllib import request as urlrequest
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db import DatabaseError
from django.conf import settings
import logging
import requests

from users.models import User, UserEngagementScore
from users.scoring import refresh_user_score
from users.visibility import admin_boost_visibility, admin_reduce_visibility, admin_force_inject
from interactions.models import Like, Pass, DailySwipe
from matches.models import Match
from block.models import Block
from report.models import Report
from chat.models import Conversation, Message, SupportConversation, MessageFlag
from chat.serializers import SupportConversationSerializer, MessageSerializer, MessageFlagSerializer
from notifications.models import Notification
from admin_dashboard.models import ProfileImpression, ReportCase, CaseAssignment
from admin_dashboard.services.ranking import compute_ranking_score
from users.throttles import AdminLoginThrottle
from users.auth_cookies import set_auth_cookies, clear_auth_cookies, get_refresh_token_from_request

# Waitlist models only (no serializers import – we define them inline)
from waitlist.models import WaitlistEntry, WaitlistStats, ContactedArchive

logger = logging.getLogger(__name__)


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

        user = authenticate(request, email=email, password=password)
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
            if user_type not in {'app', 'admin'}:
                user_type = 'app'

            queryset = User.objects.all().order_by('-date_joined')
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

            total = queryset.count()
            start = (page - 1) * limit
            end = start + limit
            paginated_users = list(
                queryset.annotate(
                    matches_count_agg=Count('matches_as_user1', distinct=True) + Count('matches_as_user2', distinct=True),
                    reports_received_count_agg=Count('reports_received', distinct=True),
                )[start:end]
            )
            scorecards = {
                card.user_id: card
                for card in UserEngagementScore.objects.filter(user__in=paginated_users)
            }

            data = []
            for user in paginated_users:
                matches_count = getattr(user, 'matches_count_agg', 0) or 0
                reports_received_count = getattr(user, 'reports_received_count_agg', 0) or 0
                risk = 'risky' if reports_received_count >= 5 else 'watch' if reports_received_count >= 2 else 'safe'
                scorecard = scorecards.get(user.id)

                data.append({
                    'id': user.id,
                    'email': user.email,
                    'full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                    'username': user.username,
                    'profile_photo_url': user.profile_photo.url if user.profile_photo else None,
                    'is_active': user.is_active,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'role': 'superadmin' if user.is_superuser else ('staff' if user.is_staff else 'app_user'),
                    'is_verified': user.is_verified,
                    'profile_score': user.profile_score,
                    'user_score': scorecard.overall_score if scorecard else 0,
                    'total_points': scorecard.total_points if scorecard else 0,
                    'matches_count': matches_count,
                    'reports_received_count': reports_received_count,
                    'risk_status': risk,
                    'date_joined': user.date_joined,
                })

            return Response({
                'data': data,
                'total': total,
                'page': page,
                'pages': ceil(total / limit) if limit > 0 else 1,
                'user_type': user_type,
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

        user.save()
        return Response({'success': True})

    def delete(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        if user.id == request.user.id:
            return Response({'error': 'You cannot delete your own account'}, status=400)
        user.delete()
        return Response({'success': True})


# ---------- Dashboard ----------
class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
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

        # Recent blocks
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

        # Analytics metrics
        total_impressions = ProfileImpression.objects.count()
        total_likes_from_impressions = ProfileImpression.objects.filter(swipe_action='like').count()
        total_passes_from_impressions = ProfileImpression.objects.filter(swipe_action='pass').count()
        
        impression_conversion_rate = round((total_likes_from_impressions / total_impressions) * 100, 1) if total_impressions > 0 else 0
        avg_ranking_score = ProfileImpression.objects.aggregate(avg=Avg('ranking_score'))['avg'] or 0
        
        pos1_impressions = ProfileImpression.objects.filter(feed_position=0).count()
        pos1_likes = ProfileImpression.objects.filter(feed_position=0, swipe_action='like').count()
        position1_like_rate = round((pos1_likes / pos1_impressions) * 100, 1) if pos1_impressions > 0 else 0
        
        # Top performing profiles
        seven_days_ago = timezone.now() - timedelta(days=7)
        top_profiles = []
        profile_stats = ProfileImpression.objects.filter(
            timestamp__gte=seven_days_ago,
            was_swiped=True
        ).values('viewed__email', 'viewed__id').annotate(
            total_impressions=Count('id'),
            likes=Count('id', filter=Q(swipe_action='like')),
            avg_position=Avg('feed_position')
        ).filter(total_impressions__gte=5).order_by('-likes')[:10]
        
        for stat in profile_stats:
            like_rate = round((stat['likes'] / stat['total_impressions']) * 100, 1)
            top_profiles.append({
                'user_id': stat['viewed__id'],
                'user_email': stat['viewed__email'],
                'impressions': stat['total_impressions'],
                'likes': stat['likes'],
                'like_rate': like_rate,
                'avg_position': stat['avg_position'],
            })
        
        # Position performance
        position_performance = []
        for pos in range(15):
            pos_imp = ProfileImpression.objects.filter(feed_position=pos)
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
            'active_today': active_today,
            'likes_today': likes_today,
            'passes_today': passes_today,
            'matches_today': matches_today,
            'match_rate': match_rate,
            'recent_blocks': blocks_data,
            'total_impressions': total_impressions,
            'total_likes_from_impressions': total_likes_from_impressions,
            'total_passes_from_impressions': total_passes_from_impressions,
            'impression_conversion_rate': impression_conversion_rate,
            'avg_ranking_score': round(avg_ranking_score, 1),
            'position1_like_rate': position1_like_rate,
            'top_performing_profiles': top_profiles,
            'position_performance': position_performance,
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

            max_days = 90
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

        # --- Behavioral launch metrics (critical dating-product truth metrics) ---
            cohort_users = product_users.filter(
            date_joined__gte=range_start,
            date_joined__lt=range_end,
        )
            first_like_subquery = Like.objects.filter(
            from_user=OuterRef('pk')
        ).order_by('created_at').values('created_at')[:1]
            first_match_subquery = Match.objects.filter(
            Q(user1=OuterRef('pk')) | Q(user2=OuterRef('pk'))
        ).order_by('created_at').values('created_at')[:1]

            cohort_with_firsts = cohort_users.annotate(
            first_like_at=Subquery(first_like_subquery),
            first_match_at=Subquery(first_match_subquery),
        ).values('date_joined', 'first_like_at', 'first_match_at')

            like_latencies = []
            match_latencies = []
            for row in cohort_with_firsts:
                joined_at = row.get('date_joined')
                first_like_at = row.get('first_like_at')
                first_match_at = row.get('first_match_at')
                if joined_at and first_like_at and first_like_at >= joined_at:
                    like_latencies.append((first_like_at - joined_at).total_seconds())
                if joined_at and first_match_at and first_match_at >= joined_at:
                    match_latencies.append((first_match_at - joined_at).total_seconds())

            def _summary(values):
                if not values:
                    return {'avg_seconds': None, 'median_seconds': None, 'samples': 0}
                ordered = sorted(values)
                n = len(ordered)
                if n % 2 == 1:
                    median = ordered[n // 2]
                else:
                    median = (ordered[(n // 2) - 1] + ordered[n // 2]) / 2
                avg = sum(ordered) / n
                return {
                    'avg_seconds': round(avg, 1),
                    'median_seconds': round(median, 1),
                    'samples': n,
                }

            matches_in_range = Match.objects.filter(
            created_at__gte=range_start,
            created_at__lt=range_end,
            user1_id__in=product_user_ids,
            user2_id__in=product_user_ids,
        )

            total_matches_in_range = matches_in_range.count()
            matched_with_message = 0
            match_to_first_message_latencies = []
            for m in matches_in_range:
                try:
                    conv = m.conversation
                except Conversation.DoesNotExist:
                    conv = None
                first_message_at = getattr(conv, 'first_message_at', None) if conv else None
                if first_message_at:
                    matched_with_message += 1
                    if first_message_at >= m.created_at:
                        match_to_first_message_latencies.append((first_message_at - m.created_at).total_seconds())

            match_to_message_rate = (
                round((matched_with_message / total_matches_in_range) * 100, 1)
                if total_matches_in_range else 0.0
            )

            started_conversations = Conversation.objects.filter(
            match__created_at__gte=range_start,
            match__created_at__lt=range_end,
            first_message_at__isnull=False,
        )
            conversation_depth_values = []
            for conv in started_conversations:
                count = conv.messages.filter(sender_type='user').count()
                if count > 0:
                    conversation_depth_values.append(count)
            avg_messages_per_started_conversation = (
                round(sum(conversation_depth_values) / len(conversation_depth_values), 2)
                if conversation_depth_values else 0.0
            )

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
                'time_to_first_like': _summary(like_latencies),
                'time_to_first_match': _summary(match_latencies),
                'match_to_message_rate_percent': match_to_message_rate,
                'time_match_to_first_message': _summary(match_to_first_message_latencies),
                'avg_messages_per_started_conversation': avg_messages_per_started_conversation,
                'cohort_users_count': cohort_users.count(),
                'matches_in_range_count': total_matches_in_range,
                'matches_with_message_count': matched_with_message,
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
        user = get_object_or_404(User, id=user_id)
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
            'profile_photo_url': user.profile_photo.url if user.profile_photo else None,
            'gender': user.gender,
            'city': user.city,
            'country': user.country,
            'bio': user.bio,
            'account_type': user.account_type,
            'profile_score': user.profile_score,
            'is_active': user.is_active,
            'is_verified': user.is_verified,
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
        action = request.data.get('action')
        if not user_id or not action:
            return Response({'error': 'user_id and action required'}, status=400)

        target = get_object_or_404(User, id=user_id)
        if target.id == request.user.id:
            return Response({'error': 'Cannot act on yourself'}, status=400)

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
        now = timezone.now()
        product_users = _product_users_queryset()
        total_product_users = product_users.count()

        monitored_users = product_users.annotate(
            matches_count_agg=Count('matches_as_user1', distinct=True) + Count('matches_as_user2', distinct=True),
            impressions_24h_agg=Count(
                'impressions_received',
                filter=Q(impressions_received__timestamp__gte=now - timedelta(hours=24)),
                distinct=True,
            ),
            likes_given_24h_agg=Count(
                'likes_sent',
                filter=Q(likes_sent__created_at__gte=now - timedelta(hours=24)),
                distinct=True,
            ),
        )

        zero_match_qs = monitored_users.filter(matches_count_agg=0).order_by('-last_activity', '-date_joined')[:50]

        zero_match_users = [
            {
                'id': user.id,
                'email': user.email,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                'date_joined': user.date_joined,
                'last_activity': user.last_activity,
                'impressions_24h': getattr(user, 'impressions_24h_agg', 0) or 0,
                'likes_given_24h': getattr(user, 'likes_given_24h_agg', 0) or 0,
                'minutes_since_join': int((now - user.date_joined).total_seconds() // 60) if user.date_joined else None,
            }
            for user in zero_match_qs
        ]

        aggregate_matches = monitored_users.aggregate(
            total_m1=Count('matches_as_user1', distinct=True),
            total_m2=Count('matches_as_user2', distinct=True),
        )
        total_matches_links = (aggregate_matches.get('total_m1') or 0) + (aggregate_matches.get('total_m2') or 0)
        avg_matches_per_user = round(total_matches_links / max(1, total_product_users), 2)

        # Keep this lightweight for dashboard speed.
        median_first_match_seconds = None

        return Response({
            'total_product_users': total_product_users,
            'zero_match_users_count': len(zero_match_users),
            'avg_matches_per_user': avg_matches_per_user,
            'median_time_to_first_match_seconds': median_first_match_seconds,
            'zero_match_users': zero_match_users,
            'generated_at': now,
        })


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

            queryset = Report.objects.select_related('reporter', 'reported_user').order_by('-created_at')
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

            data = []
            for r in reports:
                data.append({
                    'id': r.id,
                    'reporter_email': r.reporter.email,
                    'reporter_name': f"{r.reporter.first_name} {r.reporter.last_name}".strip() or r.reporter.email,
                    'reported_user_email': r.reported_user.email,
                    'reported_user_name': f"{r.reported_user.first_name} {r.reported_user.last_name}".strip() or r.reported_user.email,
                    'reason': r.get_reason_display(),
                    'status': r.status,
                    'created_at': r.created_at,
                    'description': r.description,
                    'admin_notes': r.admin_notes,
                    'action_taken': r.action_taken,
                })

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


class AdminReportDetailView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, pk):
        try:
            report = get_object_or_404(Report.objects.select_related('reporter', 'reported_user'), pk=pk)
            if not request.user.is_superuser:
                has_access = CaseAssignment.objects.filter(
                    case__report=report,
                    staff_user=request.user,
                    active=True,
                ).exists()
                if not has_access:
                    return Response({'error': 'Not allowed for this report'}, status=403)
            return Response({
                'id': report.id,
                'reporter_email': report.reporter.email,
                'reporter_name': f"{report.reporter.first_name} {report.reporter.last_name}".strip() or report.reporter.email,
                'reported_user_email': report.reported_user.email,
                'reported_user_name': f"{report.reported_user.first_name} {report.reported_user.last_name}".strip() or report.reported_user.email,
                'reason': report.get_reason_display(),
                'status': report.status,
                'created_at': report.created_at,
                'description': report.description,
                'admin_notes': report.admin_notes,
                'action_taken': report.action_taken,
                'screenshot': report.screenshot.url if report.screenshot else None,
                'match_id': report.match_id,
            })
        except DatabaseError as exc:
            logger.exception("AdminReportDetailView database error: %s", exc)
            return Response({'error': 'Temporary database issue while loading report detail.'}, status=503)


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
            qs = _report_case_queryset_for_user(request.user)
            if report_id:
                qs = qs.filter(report_id=report_id)
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
        if not request.user.is_superuser:
            return Response({'error': 'Only superuser can create cases'}, status=403)
        try:
            report_id = request.data.get('report_id')
            title = (request.data.get('title') or '').strip()
            if not report_id or not title:
                return Response({'error': 'report_id and title are required'}, status=400)
            report = get_object_or_404(Report, id=report_id)
            case = ReportCase.objects.create(
                report=report,
                title=title,
                description=(request.data.get('description') or '').strip(),
                status=(request.data.get('status') or 'open').strip(),
                priority=(request.data.get('priority') or 'medium').strip(),
                department=(request.data.get('department') or 'safety').strip(),
                final_note=(request.data.get('final_note') or '').strip(),
                action_taken=(request.data.get('action_taken') or '').strip(),
                close_summary=(request.data.get('close_summary') or '').strip(),
                created_by=request.user,
                due_at=request.data.get('due_at') or None,
            )
            return Response({'success': True, 'id': case.id, 'case': _serialize_report_case(case)}, status=201)
        except DatabaseError as exc:
            logger.exception("AdminReportCasesView create database error: %s", exc)
            return Response({'error': 'Temporary database issue while creating case.'}, status=503)


class AdminReportCaseDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, case_id):
        try:
            case = get_object_or_404(ReportCase, id=case_id)
            if not request.user.is_superuser and not CaseAssignment.objects.filter(case=case, staff_user=request.user, active=True).exists():
                return Response({'error': 'Not allowed for this case'}, status=403)
            payload = request.data
            for field in ['title', 'description', 'status', 'priority', 'department']:
                if field in payload:
                    setattr(case, field, (payload.get(field) or '').strip())
            for field in ['final_note', 'action_taken', 'close_summary']:
                if field in payload:
                    setattr(case, field, (payload.get(field) or '').strip())
            if 'due_at' in payload:
                case.due_at = payload.get('due_at') or None
            if case.status in {'resolved', 'closed'} and case.closed_at is None:
                case.closed_at = timezone.now()
            if case.status not in {'resolved', 'closed'}:
                case.closed_at = None
            case.save()
            return Response({'success': True, 'case': _serialize_report_case(case)})
        except DatabaseError as exc:
            logger.exception("AdminReportCaseDetailView update database error: %s", exc)
            return Response({'error': 'Temporary database issue while updating case.'}, status=503)

    def delete(self, request, case_id):
        if not request.user.is_superuser:
            return Response({'error': 'Only superuser can delete cases'}, status=403)
        case = get_object_or_404(ReportCase, id=case_id)
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
        case = get_object_or_404(ReportCase, id=case_id)
        staff_user_id = request.data.get('staff_user_id')
        if not staff_user_id:
            return Response({'error': 'staff_user_id is required'}, status=400)
        staff_user = get_object_or_404(User, id=staff_user_id, is_staff=True)
        assignment = CaseAssignment.objects.create(
            case=case,
            staff_user=staff_user,
            assigned_by=request.user,
            notes=(request.data.get('notes') or '').strip(),
            active=bool(request.data.get('active', True)),
        )
        return Response({'success': True, 'id': assignment.id}, status=201)


class AdminCaseAssignmentDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, assignment_id):
        assignment = get_object_or_404(CaseAssignment, id=assignment_id)
        if not request.user.is_superuser and assignment.staff_user_id != request.user.id:
            return Response({'error': 'Not allowed for this assignment'}, status=403)
        payload = request.data
        if 'notes' in payload:
            assignment.notes = (payload.get('notes') or '').strip()
        if 'active' in payload:
            assignment.active = bool(payload.get('active'))
        if 'staff_user_id' in payload:
            if not request.user.is_superuser:
                return Response({'error': 'Only superuser can reassign'}, status=403)
            reassigned = get_object_or_404(User, id=payload.get('staff_user_id'), is_staff=True)
            assignment.staff_user = reassigned
        assignment.save()
        return Response({'success': True})

    def delete(self, request, assignment_id):
        if not request.user.is_superuser:
            return Response({'error': 'Only superuser can delete assignments'}, status=403)
        assignment = get_object_or_404(CaseAssignment, id=assignment_id)
        assignment.delete()
        return Response({'success': True})


# ---------- Support & Messaging ----------
class AdminSupportConversationListView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        status = request.GET.get('status')
        qs = SupportConversation.objects.all().order_by('-updated_at')
        if status:
            qs = qs.filter(status=status)
        serializer = SupportConversationSerializer(qs, many=True)
        return Response(serializer.data)


class AdminSupportConversationDetailView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, pk):
        conv = get_object_or_404(SupportConversation, pk=pk)
        serializer = SupportConversationSerializer(conv)
        return Response(serializer.data)


class AdminReplyToSupportView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request, pk):
        conv = get_object_or_404(SupportConversation, pk=pk)
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message content required'}, status=400)
        msg = Message.objects.create(support_conversation=conv, sender=request.user, sender_type='admin', content=content)
        if conv.status == 'closed':
            conv.status = 'open'
            conv.save()
        serializer = MessageSerializer(msg)
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
        convs = Conversation.objects.all().order_by('-updated_at')
        data = []
        for c in convs:
            participants = c.get_participants()
            data.append({
                'id': c.id,
                'participants': [p.email for p in participants],
                'last_message': c.last_message().content if c.last_message() else None,
                'last_message_at': c.last_message_at,
                'created_at': c.created_at,
            })
        return Response(data)


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
        
            viewer_search = request.GET.get('viewer_email')
            if viewer_search:
                queryset = queryset.filter(Q(viewer__email__icontains=viewer_search) | Q(viewer__first_name__icontains=viewer_search) | Q(viewer__last_name__icontains=viewer_search))
        
            viewed_search = request.GET.get('viewed_email')
            if viewed_search:
                queryset = queryset.filter(Q(viewed__email__icontains=viewed_search) | Q(viewed__first_name__icontains=viewed_search) | Q(viewed__last_name__icontains=viewed_search))
        
            swipe_action = request.GET.get('swipe_action')
            if swipe_action and swipe_action != '':
                queryset = queryset.filter(swipe_action=swipe_action)
        
            date_from = request.GET.get('date_from')
            if date_from:
                queryset = queryset.filter(timestamp__date__gte=date_from)
        
            date_to = request.GET.get('date_to')
            if date_to:
                queryset = queryset.filter(timestamp__date__lte=date_to)
        
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
        
            return Response(data)
        except Exception as exc:
            logger.exception("AdminAnalyticsImpressionsView failed; returning empty list: %s", exc)
            return Response([], status=status.HTTP_200_OK)


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
    batch_size = max(20, min(int(batch_size or 20), 500))
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


class AdminWaitlistCampaignPreviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        batch_size = request.GET.get('batch_size', 20)
        women_ratio = request.GET.get('women_ratio', 55)
        subject_template = request.GET.get('subject_template')
        body_template = request.GET.get('body_template')
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
        batch_size = request.data.get('batch_size', 20)
        women_ratio = request.data.get('women_ratio', 55)
        subject_template = request.data.get('subject_template')
        body_template = request.data.get('body_template')
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




from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Q
from django.shortcuts import get_object_or_404
from math import ceil

from users.models import User
from interactions.models import Like, Pass
from matches.models import Match
from block.models import Block
from report.models import Report
from chat.models import Conversation, Message
from notifications.models import Notification


# ---------- Admin login ----------
class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'Email and password required'}, status=400)

        user = authenticate(request, email=email, password=password)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=401)
        if not user.is_staff:
            return Response({'error': 'Not authorized as staff'}, status=403)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'staff_id': user.id,
            'staff_email': user.email,
        })


# ---------- Dashboard ----------
class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        start_of_day = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        end_of_day = timezone.make_aware(timezone.datetime.combine(today + timezone.timedelta(days=1), timezone.datetime.min.time()))

        total_users = User.objects.filter(is_active=True).count()
        active_today = User.objects.filter(last_activity__gte=start_of_day).count()
        likes_today = Like.objects.filter(created_at__gte=start_of_day, created_at__lt=end_of_day).count()
        passes_today = Pass.objects.filter(created_at__gte=start_of_day, created_at__lt=end_of_day).count()
        matches_today = Match.objects.filter(created_at__gte=start_of_day, created_at__lt=end_of_day).count()
        total_swipes = likes_today + passes_today
        match_rate = round((matches_today / total_swipes) * 100, 1) if total_swipes > 0 else 0.0

        recent_blocks = Block.objects.select_related('blocker', 'blocked').order_by('-created_at')[:10]
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

        return Response({
            'total_users': total_users,
            'active_today': active_today,
            'likes_today': likes_today,
            'passes_today': passes_today,
            'matches_today': matches_today,
            'match_rate': match_rate,
            'recent_blocks': blocks_data,
        })


# ---------- User list (with pagination, search, filter) ----------
class AdminUsersListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 10))
        search = request.GET.get('search', '').strip()
        status_filter = request.GET.get('status', 'all')

        queryset = User.objects.all().order_by('-date_joined')
        if search:
            queryset = queryset.filter(Q(full_name__icontains=search) | Q(email__icontains=search))
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)
        elif status_filter == 'verified':
            queryset = queryset.filter(is_verified=True)

        total = queryset.count()
        start = (page - 1) * limit
        end = start + limit
        paginated_users = queryset[start:end]

        data = []
        for user in paginated_users:
            matches_count = Match.objects.filter(Q(user1=user) | Q(user2=user)).count()
            reports_received_count = Report.objects.filter(reported_user=user).count()
            risk = 'risky' if reports_received_count >= 5 else 'watch' if reports_received_count >= 2 else 'safe'
            data.append({
                'id': user.id,
                'email': user.email,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                'profile_photo_url': user.profile_photo.url if user.profile_photo else None,
                'is_active': user.is_active,
                'is_verified': user.is_verified,
                'profile_score': user.profile_score,
                'matches_count': matches_count,
                'reports_received_count': reports_received_count,
                'risk_status': risk,
                'date_joined': user.date_joined,
            })

        return Response({
            'data': data,
            'total': total,
            'page': page,
            'pages': ceil(total / limit) if limit > 0 else 1
        })


# ---------- User detail (basic + full with ?full=true) ----------
class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        full = request.query_params.get('full') == 'true'

        # Basic user data
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
            'age': user.birth_date.year if user.birth_date else None,
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
            'active_matches': 0,
            'streak_days': 0,
            'total_messages_received': 0,
        }

        # Recent matches
        recent_matches = []
        matches = Match.objects.filter(Q(user1=user) | Q(user2=user)).order_by('-created_at')[:5]
        for m in matches:
            other = m.user2 if m.user1 == user else m.user1
            recent_matches.append({
                'id': m.id,
                'with_user': other.email if other else None,
                'created_at': m.created_at
            })
        response_data['recent_matches'] = recent_matches

        # Recent reports
        recent_reports = []
        for r in Report.objects.filter(reported_user=user).order_by('-created_at')[:5]:
            recent_reports.append({
                'id': r.id,
                'reporter': r.reporter.email if r.reporter else None,
                'reason': r.reason,
                'status': r.status,
                'created_at': r.created_at
            })
        response_data['recent_reports'] = recent_reports

        # Recent blocks (received)
        recent_blocks = []
        for b in Block.objects.filter(blocked=user).order_by('-created_at')[:5]:
            recent_blocks.append({
                'id': b.id,
                'blocker': b.blocker.email if b.blocker else None,
                'created_at': b.created_at
            })
        response_data['recent_blocks'] = recent_blocks

        # If full=true, add extra data
        if full:
            # All matches
            all_matches = []
            for m in Match.objects.filter(Q(user1=user) | Q(user2=user)).order_by('-created_at'):
                other = m.user2 if m.user1 == user else m.user1
                all_matches.append({
                    'id': m.id,
                    'with_user': other.email if other else None,
                    'created_at': m.created_at
                })
            response_data['all_matches'] = all_matches

            # Blocks sent & received
            response_data['blocks_sent'] = [
                {'id': b.id, 'blocked_email': b.blocked.email if b.blocked else None, 'created_at': b.created_at}
                for b in Block.objects.filter(blocker=user).order_by('-created_at')
            ]
            response_data['blocks_received'] = [
                {'id': b.id, 'blocker_email': b.blocker.email if b.blocker else None, 'created_at': b.created_at}
                for b in Block.objects.filter(blocked=user).order_by('-created_at')
            ]

            # Conversations
            conversations = []
            conv_qs = Conversation.objects.filter(Q(match__user1=user) | Q(match__user2=user)).order_by('-updated_at')
            for conv in conv_qs:
                try:
                    other = conv.get_other_user(user) if hasattr(conv, 'get_other_user') else None
                    last_msg = conv.last_message() if hasattr(conv, 'last_message') else None
                    messages = []
                    for msg in conv.messages.all().order_by('created_at'):
                        try:
                            messages.append({
                                'id': msg.id,
                                'sender_email': msg.sender.email if msg.sender else None,
                                'content': msg.content,
                                'read': msg.read,
                                'created_at': msg.created_at
                            })
                        except Exception:
                            continue
                    conversations.append({
                        'id': conv.id,
                        'other_participant': other.email if other and hasattr(other, 'email') else None,
                        'created_at': conv.created_at,
                        'updated_at': conv.updated_at,
                        'last_message_at': conv.last_message_at,
                        'messages': messages,
                        'last_message': {
                            'sender_email': last_msg.sender.email if last_msg and last_msg.sender else None,
                            'content': last_msg.content
                        } if last_msg else None
                    })
                except Exception:
                    continue
            response_data['conversations'] = conversations

            # All reports received
            response_data['all_reports_received'] = [
                {
                    'id': r.id,
                    'reporter_email': r.reporter.email if r.reporter else None,
                    'reason': r.reason,
                    'status': r.status,
                    'created_at': r.created_at
                }
                for r in Report.objects.filter(reported_user=user).order_by('-created_at')
            ]

            # Notifications (last 100)
            response_data['all_notifications'] = [
                {
                    'id': n.id,
                    'title': n.title,
                    'message': n.message,
                    'is_read': n.is_read,
                    'created_at': n.created_at
                }
                for n in Notification.objects.filter(recipient=user).order_by('-created_at')[:100]
            ]

        return Response(response_data)


# ---------- Admin actions (ban/unban/verify) ----------
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
        else:
            return Response({'error': 'Invalid action'}, status=400)


# ---------- Additional admin actions (block, ban, unban, deactivate) ----------
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



        
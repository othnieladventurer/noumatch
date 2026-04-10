from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from math import ceil

from users.models import User
from interactions.models import Like, Pass, DailySwipe
from matches.models import Match
from block.models import Block
from report.models import Report
from chat.models import Conversation, Message
from notifications.models import Notification

from django.db.models import Sum
from datetime import timedelta
from django.db.models.functions import TruncDate




from chat.models import SupportConversation, MessageFlag, Message
from chat.serializers import SupportConversationSerializer, MessageSerializer, MessageFlagSerializer




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








class AdminReportsListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.GET.get('status')
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))

        queryset = Report.objects.all().order_by('-created_at')
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

        return Response({
            'data': data,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        })


class AdminReportDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        report = get_object_or_404(Report, pk=pk)
        data = {
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
        }
        return Response(data)


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






class AdminSwipeStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Pagination parameters
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 10))  # days per page
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)

        # Daily likes and passes (aggregated)
        likes_by_date = Like.objects.filter(
            created_at__date__range=[start_date, end_date]
        ).annotate(date=TruncDate('created_at')).values('date').annotate(total=Count('id'))

        passes_by_date = Pass.objects.filter(
            created_at__date__range=[start_date, end_date]
        ).annotate(date=TruncDate('created_at')).values('date').annotate(total=Count('id'))

        likes_dict = {item['date']: item['total'] for item in likes_by_date}
        passes_dict = {item['date']: item['total'] for item in passes_by_date}

        # Build full daily list (newest to oldest)
        daily_data = []
        current = end_date
        while current >= start_date:  # descending order
            daily_data.append({
                'date': current.isoformat(),
                'likes': likes_dict.get(current, 0),
                'passes': passes_dict.get(current, 0),
            })
            current -= timedelta(days=1)

        # Paginate
        total_days = len(daily_data)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_days = daily_data[start_idx:end_idx]

        # Totals
        total_likes = Like.objects.count()
        total_passes = Pass.objects.count()

        # Today
        today = end_date
        today_likes = Like.objects.filter(created_at__date=today).count()
        today_passes = Pass.objects.filter(created_at__date=today).count()

        # Top users (last 7 days)
        last_week = end_date - timedelta(days=7)
        top_users = User.objects.filter(
            Q(likes_sent__created_at__date__gte=last_week) |
            Q(passes_sent__created_at__date__gte=last_week)
        ).annotate(
            total_swipes=Count('likes_sent') + Count('passes_sent')
        ).order_by('-total_swipes')[:10]

        top_users_data = [
            {
                'name': f"{u.first_name} {u.last_name}".strip() or u.email,
                'email': u.email,
                'total_swipes': u.total_swipes
            } for u in top_users
        ]

        return Response({
            'daily_data': paginated_days,
            'total_days': total_days,
            'page': page,
            'pages': ceil(total_days / limit) if limit > 0 else 1,
            'total_likes': total_likes,
            'total_passes': total_passes,
            'today_likes': today_likes,
            'today_passes': today_passes,
            'top_users': top_users_data
        })







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

    def get_messages(self, request, pk):
        conv = get_object_or_404(SupportConversation, pk=pk)
        messages = conv.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)






class AdminReplyToSupportView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request, pk):
        conv = get_object_or_404(SupportConversation, pk=pk)
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message content required'}, status=400)
        msg = Message.objects.create(
            support_conversation=conv,
            sender=request.user,
            sender_type='admin',
            content=content
        )
        # if conversation was closed, reopen
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
        action = request.data.get('action')  # 'ban_user', 'delete_message', 'warn'
        # Perform action
        if action == 'ban_user' and flag.message.sender:
            flag.message.sender.is_active = False
            flag.message.sender.save()
        elif action == 'delete_message':
            flag.message.delete()
        # Optionally add a system message to support conversation if applicable
        flag.delete()  # remove flag after action
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
        data = {
            'id': conv.id,
            'participants': [p.email for p in participants],
            'created_at': conv.created_at,
            'last_message_at': conv.last_message_at,
        }
        return Response(data)





class AdminUserConversationMessagesView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, pk):
        conv = get_object_or_404(Conversation, pk=pk)
        messages = conv.messages.all().order_by('created_at')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)




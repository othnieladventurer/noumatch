from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Count, Q
from users.models import User
from interactions.models import Like, Pass
from matches.models import Match
from block.models import Block
from report.models import Report   # if you have a report app







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






# ---------- Dashboard metrics ----------
class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        tomorrow = today + timezone.timedelta(days=1)
        start_of_day = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        end_of_day = timezone.make_aware(timezone.datetime.combine(tomorrow, timezone.datetime.min.time()))

        total_users = User.objects.filter(is_active=True).count()
        active_today = User.objects.filter(last_activity__gte=start_of_day).count()

        likes_today = Like.objects.filter(created_at__gte=start_of_day, created_at__lt=end_of_day).count()
        passes_today = Pass.objects.filter(created_at__gte=start_of_day, created_at__lt=end_of_day).count()
        matches_today = Match.objects.filter(created_at__gte=start_of_day, created_at__lt=end_of_day).count()

        total_swipes = likes_today + passes_today
        match_rate = round((matches_today / total_swipes) * 100, 1) if total_swipes > 0 else 0.0

        recent_blocks = Block.objects.select_related('blocker', 'blocked') \
                          .order_by('-created_at')[:10] \
                          .values('id', 'blocker__email', 'blocked__email', 'created_at')

        return Response({
            'total_users': total_users,
            'active_today': active_today,
            'likes_today': likes_today,
            'passes_today': passes_today,
            'matches_today': matches_today,
            'match_rate': match_rate,
            'recent_blocks': list(recent_blocks),
        })




# ---------- Staff actions ----------
class AdminUserActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        user_id = request.data.get('user_id')
        action = request.data.get('action')   # 'ban', 'unban', 'verify'

        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

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




class AdminReportResolveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        report_id = request.data.get('report_id')
        try:
            report = Report.objects.get(id=report_id)
            report.is_resolved = True   # ensure your Report model has this field
            report.save()
            return Response({'message': 'Report resolved'})
        except Report.DoesNotExist:
            return Response({'error': 'Report not found'}, status=404)
        







        
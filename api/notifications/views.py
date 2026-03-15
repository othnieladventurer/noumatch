# notifications/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Notification
from .serializers import (
    NotificationSerializer, 
    NotificationMarkReadSerializer,
    NotificationCreateSerializer
)
from .utils import send_realtime_notification

User = get_user_model()

# notifications/views.py
class NotificationListView(generics.ListAPIView):
    """Get all notifications for current user"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Notification.objects.filter(
            recipient=self.request.user,
            is_archived=False
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )
        
        # Log what we're sending
        print(f"🔍 [NOTIFICATION-LIST] User {self.request.user.id} fetching notifications")
        print(f"🔍 [NOTIFICATION-LIST] Total notifications: {queryset.count()}")
        print(f"🔍 [NOTIFICATION-LIST] Unread count: {queryset.filter(is_read=False).count()}")
        
        # Log each notification's read status
        for notif in queryset.order_by('-created_at')[:5]:  # Log first 5
            print(f"🔍 [NOTIFICATION-LIST] Notification {notif.id}: type={notif.type}, is_read={notif.is_read}, read_at={notif.read_at}, created={notif.created_at}")
        
        return queryset
    


    

class UnreadNotificationCountView(APIView):
    """Get unread notification count"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        count = Notification.get_unread_count(request.user)
        return Response({'unread_count': count})




# notifications/views.py
class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        queryset = Notification.objects.filter(recipient=request.user)
        now = timezone.now()
        
        # Log BEFORE marking
        print(f"🔍 [MARK-READ] User {request.user.id} requesting to mark notifications as read")
        print(f"🔍 [MARK-READ] Data received: {serializer.validated_data}")
        
        if serializer.validated_data.get('mark_all'):
            # Get unread notifications BEFORE updating
            unread_notifications = list(queryset.filter(is_read=False).values('id', 'type', 'title'))
            print(f"🔍 [MARK-READ] Unread notifications before mark-all: {unread_notifications}")
            
            count = queryset.filter(is_read=False).update(is_read=True, read_at=now)
            print(f"📝 [MARK-READ] Marked {count} notifications as read for user {request.user.id}")
            
            # Verify after update
            still_unread = queryset.filter(is_read=False).count()
            print(f"🔍 [MARK-READ] Notifications still unread after mark-all: {still_unread}")
            
            return Response({'marked_count': count})
        
        notification_ids = serializer.validated_data.get('notification_ids', [])
        if notification_ids:
            # Get specific notifications BEFORE updating
            unread_specific = list(queryset.filter(
                id__in=notification_ids, 
                is_read=False
            ).values('id', 'type', 'title'))
            print(f"🔍 [MARK-READ] Specific unread notifications before mark: {unread_specific}")
            
            count = queryset.filter(
                id__in=notification_ids,
                is_read=False
            ).update(is_read=True, read_at=now)
            print(f"📝 [MARK-READ] Marked {count} specific notifications as read for user {request.user.id}")
            
            # Verify after update
            for n_id in notification_ids:
                notif = queryset.filter(id=n_id).first()
                if notif:
                    print(f"🔍 [MARK-READ] Notification {n_id} read status after update: {notif.is_read}, read_at: {notif.read_at}")
            
            return Response({'marked_count': count})
        
        return Response({'marked_count': 0})    





class NotificationDetailView(generics.RetrieveAPIView):
    """Get a single notification"""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

class DeleteNotificationView(generics.DestroyAPIView):
    """Delete a notification (soft delete - archive)"""
    queryset = Notification.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_archived = True
        instance.save()

class CreateCustomNotificationView(APIView):
    """Create custom notifications (admin only)"""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        serializer = NotificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        user_ids = data.pop('user_ids')
        users = User.objects.filter(id__in=user_ids)
        
        notifications = []
        for user in users:
            notification = Notification.objects.create(
                recipient=user,
                **data
            )
            notifications.append(notification)
            
            # Send real-time notification
            send_realtime_notification(user, notification)
        
        return Response({
            'sent_count': len(notifications),
            'users': list(users.values_list('id', flat=True))
        }, status=status.HTTP_201_CREATED)



        
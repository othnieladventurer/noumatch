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

class NotificationListView(generics.ListAPIView):
    """Get all notifications for current user"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user,
            is_archived=False
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )

class UnreadNotificationCountView(APIView):
    """Get unread notification count"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        count = Notification.get_unread_count(request.user)
        return Response({'unread_count': count})

class MarkNotificationReadView(APIView):
    """Mark notifications as read"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if serializer.validated_data.get('mark_all'):
            count = Notification.mark_all_as_read(request.user)
            return Response({'marked_count': count})
        
        notification_ids = serializer.validated_data.get('notification_ids', [])
        if notification_ids:
            count = Notification.objects.filter(
                id__in=notification_ids,
                recipient=request.user
            ).update(
                is_read=True,
                read_at=timezone.now()
            )
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



        
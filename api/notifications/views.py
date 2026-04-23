import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import (
    NotificationSerializer,
    NotificationMarkReadSerializer,
    NotificationCreateSerializer,
)
from .utils import send_realtime_notification

User = get_user_model()
VERBOSE_NOTIFICATION_LOGS = getattr(settings, "VERBOSE_NOTIFICATION_LOGS", False)


class NotificationListView(generics.ListAPIView):
    """Get all notifications for current user"""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(
            recipient=self.request.user,
            is_archived=False,
        ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))

        if VERBOSE_NOTIFICATION_LOGS:
            logging.info(
                "[NOTIFICATION-LIST] user_id=%s total=%s unread=%s",
                self.request.user.id,
                queryset.count(),
                queryset.filter(is_read=False).count(),
            )

        return queryset


class UnreadNotificationCountView(APIView):
    """Get unread notification count"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.get_unread_count(request.user)
        return Response({'unread_count': count})


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        queryset = Notification.objects.filter(recipient=request.user)
        now = timezone.now()

        if VERBOSE_NOTIFICATION_LOGS:
            logging.info("[MARK-READ] user_id=%s payload_received", request.user.id)

        if serializer.validated_data.get('mark_all'):
            count = queryset.filter(is_read=False).update(is_read=True, read_at=now)
            if VERBOSE_NOTIFICATION_LOGS:
                logging.info("[MARK-READ] user_id=%s marked_all=%s", request.user.id, count)
            return Response({'marked_count': count})

        notification_ids = serializer.validated_data.get('notification_ids', [])
        if notification_ids:
            count = queryset.filter(
                id__in=notification_ids,
                is_read=False,
            ).update(is_read=True, read_at=now)
            if VERBOSE_NOTIFICATION_LOGS:
                logging.info("[MARK-READ] user_id=%s marked_specific=%s", request.user.id, count)
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
            notification = Notification.objects.create(recipient=user, **data)
            notifications.append(notification)
            send_realtime_notification(user, notification)

        return Response(
            {
                'sent_count': len(notifications),
                'users': list(users.values_list('id', flat=True)),
            },
            status=status.HTTP_201_CREATED,
        )

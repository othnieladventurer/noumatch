from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Report
from .serializers import ReportSerializer, ReportCreateSerializer, ReportStatusUpdateSerializer
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()

class CreateReportView(generics.CreateAPIView):
    """Create a new report (only for matched users)"""
    serializer_class = ReportCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        # Optional: Verify that users are matched before allowing report
        reported_user = serializer.validated_data.get('reported_user')
        
        # Check if they are matched (you need to implement this based on your match model)
        from matches.models import Match  # Adjust import based on your app name
        
        are_matched = Match.objects.filter(
            models.Q(user1=self.request.user, user2=reported_user) |
            models.Q(user1=reported_user, user2=self.request.user)
        ).exists()
        
        if not are_matched:
            # You can either allow reports only from matches or just warn
            # For now, we'll allow but you can uncomment to restrict
            # raise serializers.ValidationError("You can only report users you have matched with")
            pass
        
        serializer.save()

class ReportDetailView(generics.RetrieveAPIView):
    """Get details of a specific report (admin only)"""
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAdminUser]

class UpdateReportStatusView(generics.UpdateAPIView):
    """Update report status (admin only)"""
    queryset = Report.objects.all()
    serializer_class = ReportStatusUpdateSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def perform_update(self, serializer):
        serializer.save()

class UserReportsView(generics.ListAPIView):
    """Get reports filed by the current user"""
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user)

class ReportsAboutMeView(generics.ListAPIView):
    """Get reports about the current user (user can see reports about them)"""
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Report.objects.filter(reported_user=self.request.user)

class AdminReportsListView(generics.ListAPIView):
    """List all reports (admin only)"""
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        queryset = Report.objects.all()
        
        # Filter by status if provided
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by reported user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(reported_user_id=user_id)
        
        return queryset

class CheckIfReportedView(APIView):
    """Check if current user has already reported a specific user"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        reported_user = get_object_or_404(User, id=user_id)
        
        # Check if there's a pending report from current user to this user
        report_exists = Report.objects.filter(
            reporter=request.user,
            reported_user=reported_user,
            status__in=['pending', 'investigating']
        ).exists()
        
        return Response({
            'has_reported': report_exists,
            'user_id': user_id
        })





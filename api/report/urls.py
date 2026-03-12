from django.urls import path
from . import views

app_name = 'report'

urlpatterns = [
    # Create report
    path('create/', views.CreateReportView.as_view(), name='create-report'),
    
    # User's reports
    path('my-reports/', views.UserReportsView.as_view(), name='my-reports'),
    
    # Reports about me
    path('about-me/', views.ReportsAboutMeView.as_view(), name='reports-about-me'),
    
    # Check if reported
    path('check/<int:user_id>/', views.CheckIfReportedView.as_view(), name='check-reported'),
    
    # Admin endpoints
    path('admin/list/', views.AdminReportsListView.as_view(), name='admin-reports-list'),
    path('admin/<int:pk>/', views.ReportDetailView.as_view(), name='admin-report-detail'),
    path('admin/<int:pk>/update-status/', views.UpdateReportStatusView.as_view(), name='update-report-status'),
]
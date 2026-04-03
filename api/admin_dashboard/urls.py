from django.urls import path
from .views import (
    AdminLoginView, AdminDashboardView,
    AdminUserActionView, AdminReportResolveView
)







urlpatterns = [
    path('admin_login/', AdminLoginView.as_view(), name='admin-login'),
    path('dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('user_action/', AdminUserActionView.as_view(), name='admin-user-action'),
    path('resolve_report/', AdminReportResolveView.as_view(), name='admin-resolve-report'),
]








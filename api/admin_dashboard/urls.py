from django.urls import path
from .views import (
    AdminLoginView, AdminDashboardView,
    AdminUserActionView, AdminReportResolveView, AdminUsersListView,
    AdminUserDetailView, AdminBlockUserView, AdminBanUserView,
    AdminUnbanUserView, AdminDeactivateUserView
)

urlpatterns = [
    path('admin_login/', AdminLoginView.as_view(), name='admin-login'),
    path('dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('users/list/', AdminUsersListView.as_view(), name='admin-users'),
    path('users/detail/<int:user_id>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('user_action/', AdminUserActionView.as_view(), name='admin-user-action'),
    path('resolve_report/', AdminReportResolveView.as_view(), name='admin-resolve-report'),
    path('user/block/', AdminBlockUserView.as_view(), name='admin-block-user'),
    path('user/ban/', AdminBanUserView.as_view(), name='admin-ban-user'),
    path('user/unban/', AdminUnbanUserView.as_view(), name='admin-unban-user'),
    path('user/deactivate/', AdminDeactivateUserView.as_view(), name='admin-deactivate-user'),
]
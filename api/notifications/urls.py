# notifications/urls.py
from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', views.UnreadNotificationCountView.as_view(), name='unread-count'),
    path('mark-read/', views.MarkNotificationReadView.as_view(), name='mark-read'),
    path('<int:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    path('<int:pk>/delete/', views.DeleteNotificationView.as_view(), name='notification-delete'),
    
    # Admin only
    path('admin/create/', views.CreateCustomNotificationView.as_view(), name='create-notification'),
]




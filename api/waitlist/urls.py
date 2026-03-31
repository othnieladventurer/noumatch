from django.urls import path
from . import views




urlpatterns = [
    path('join/', views.join_waitlist, name='join-waitlist'),
    path('stats/', views.waitlist_stats, name='waitlist-stats'),
    path('entries/', views.waiting_entries, name='waiting-entries'),
    path('admin/accept/<int:entry_id>/', views.accept_waitlist_entry, name='accept-waitlist'),
    path('admin/delete/<int:entry_id>/', views.delete_waitlist_entry, name='delete-waitlist'),

]



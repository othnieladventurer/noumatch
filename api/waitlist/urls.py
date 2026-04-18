from django.urls import path
from . import views

urlpatterns = [
    # ==================== PUBLIC ENDPOINTS ====================
    path('join/', views.join_waitlist, name='join-waitlist'),
    path('stats/', views.waitlist_stats, name='waitlist-stats'),
    path('check-can-register/', views.check_can_register, name='check-can-register'),
    
    # ==================== ADMIN ENDPOINTS ====================
    # Main entry lists
    path('entries/', views.waiting_entries, name='waiting-entries'),
    path('admin/waitlist/waiting/', views.waiting_entries, name='waiting_entries_admin'),
    path('admin/waitlist/accepted/', views.accepted_entries_admin, name='accepted_entries_admin'),
    path('admin/waitlist/archived/', views.archived_entries_admin, name='archived_entries_admin'),
    path('admin/waitlist/contacted/', views.contacted_entries, name='contacted_entries'),
    
    # Entry management
    path('admin/waitlist/<int:entry_id>/accept/', views.accept_waitlist_entry, name='accept_waitlist_entry'),
    path('admin/waitlist/<int:entry_id>/contact/', views.mark_contacted, name='mark_contacted'),
    path('admin/waitlist/<int:entry_id>/delete/', views.delete_waitlist_entry, name='delete_waitlist_entry'),
    
    # Archive management
    path('admin/waitlist/archive/<int:archive_id>/delete/', views.delete_archived_entry, name='delete_archived_entry'),
    
    # Bulk operations
    path('admin/waitlist/bulk-contact/', views.bulk_mark_contacted, name='bulk_mark_contacted'),
    path('admin/waitlist/campaign-list/', views.get_campaign_list, name='get_campaign_list'),
    
    # Debug endpoint
    path('admin/waitlist/debug/', views.debug_entries, name='debug_entries'),
    
    # Legacy/Alternative paths (maintained for compatibility)
    path('admin/accept/<int:entry_id>/', views.accept_waitlist_entry, name='accept-waitlist'),
    path('admin/delete/<int:entry_id>/', views.delete_waitlist_entry, name='delete-waitlist'),
    path('waitlist/<int:entry_id>/contact/', views.mark_contacted, name='mark_contacted'),



]




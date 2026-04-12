# admin_dashboard/admin.py
from django.contrib import admin
from .models import ProfileImpression

# Make sure the model exists
try:
    @admin.register(ProfileImpression)
    class ProfileImpressionAdmin(admin.ModelAdmin):
        list_display = ('id', 'viewer_email', 'viewed_email', 'timestamp', 'feed_position', 'ranking_score', 'swipe_action', 'device_type')
        list_filter = ('swipe_action', 'device_type', 'was_swiped', 'timestamp')
        search_fields = ('viewer__email', 'viewed__email', 'session_id')
        readonly_fields = ('id', 'created_at', 'timestamp')
        date_hierarchy = 'timestamp'
        list_select_related = ('viewer', 'viewed')
        
        fieldsets = (
            ('User Information', {
                'fields': ('viewer', 'viewed')
            }),
            ('Impression Data', {
                'fields': ('feed_position', 'ranking_score', 'session_id', 'device_type')
            }),
            ('Swipe Data', {
                'fields': ('was_swiped', 'swipe_action')
            }),
            ('Timestamps', {
                'fields': ('timestamp', 'created_at'),
                'classes': ('collapse',)
            }),
        )
        
        def viewer_email(self, obj):
            return obj.viewer.email
        viewer_email.short_description = 'Viewer'
        viewer_email.admin_order_field = 'viewer__email'
        
        def viewed_email(self, obj):
            return obj.viewed.email
        viewed_email.short_description = 'Viewed'
        viewed_email.admin_order_field = 'viewed__email'
        
        def get_queryset(self, request):
            return super().get_queryset(request).select_related('viewer', 'viewed')
        
        actions = ['mark_as_liked', 'mark_as_passed', 'clear_swipe_action']
        
        def mark_as_liked(self, request, queryset):
            updated = queryset.update(was_swiped=True, swipe_action='like')
            self.message_user(request, f'{updated} impressions marked as liked.')
        mark_as_liked.short_description = 'Mark selected as Liked'
        
        def mark_as_passed(self, request, queryset):
            updated = queryset.update(was_swiped=True, swipe_action='pass')
            self.message_user(request, f'{updated} impressions marked as passed.')
        mark_as_passed.short_description = 'Mark selected as Passed'
        
        def clear_swipe_action(self, request, queryset):
            updated = queryset.update(was_swiped=False, swipe_action='none')
            self.message_user(request, f'{updated} impressions cleared.')
        clear_swipe_action.short_description = 'Clear swipe data'
except ImportError:
    pass  # Model not created yet



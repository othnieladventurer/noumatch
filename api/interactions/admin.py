from django.contrib import admin
from .models import Like, Pass

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ( 'from_user', 'to_user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('from_user__username', 'to_user__username')




@admin.register(Pass)
class PassAdmin(admin.ModelAdmin):
    list_display = ['id', 'from_user', 'to_user', 'created_at', 'expires_at']
    list_filter = ['created_at', 'expires_at']
    search_fields = ['from_user__email', 'to_user__email', 'from_user__username', 'to_user__username']
    readonly_fields = ['created_at']
    raw_id_fields = ['from_user', 'to_user']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Pass Information', {
            'fields': ('from_user', 'to_user', 'created_at', 'expires_at')
        }),
    )
    
    actions = ['clear_expiry_dates']
    
    def clear_expiry_dates(self, request, queryset):
        """Clear expiry dates for selected passes"""
        updated = queryset.update(expires_at=None)
        self.message_user(request, f"{updated} pass(es) had their expiry dates cleared.")
    clear_expiry_dates.short_description = "Clear expiry dates for selected passes"


from django.contrib import admin
from .models import Report

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'reporter', 'reported_user', 'reason', 'status', 'created_at']
    list_filter = ['status', 'reason', 'created_at']
    search_fields = ['reporter__email', 'reported_user__email', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Report Information', {
            'fields': ('reporter', 'reported_user', 'match', 'reason', 'description', 'screenshot')
        }),
        ('Status', {
            'fields': ('status', 'admin_notes', 'action_taken')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    actions = ['mark_as_resolved', 'mark_as_investigating', 'dismiss_reports']
    
    def mark_as_resolved(self, request, queryset):
        queryset.update(status='resolved')
    mark_as_resolved.short_description = "Mark selected reports as resolved"
    
    def mark_as_investigating(self, request, queryset):
        queryset.update(status='investigating')
    mark_as_investigating.short_description = "Mark selected reports as under investigation"
    
    def dismiss_reports(self, request, queryset):
        queryset.update(status='dismissed')
    dismiss_reports.short_description = "Dismiss selected reports"



    
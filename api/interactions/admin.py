from django.contrib import admin
from .models import Like, Pass, DailySwipe
from django.utils import timezone
from datetime import timedelta

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ['id', 'from_user', 'to_user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['from_user__email', 'to_user__email', 'from_user__username', 'to_user__username']
    readonly_fields = ['created_at']
    raw_id_fields = ['from_user', 'to_user']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Like Information', {
            'fields': ('from_user', 'to_user', 'created_at')
        }),
    )


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


@admin.register(DailySwipe)
class DailySwipeAdmin(admin.ModelAdmin):
    list_display = [
        'id', 
        'user', 
        'get_user_email',
        'swipe_type', 
        'count', 
        'date',
        'get_day_of_week'
    ]
    list_filter = ['swipe_type', 'date', 'user__account_type']
    search_fields = [
        'user__email', 
        'user__username', 
        'user__first_name', 
        'user__last_name'
    ]
    readonly_fields = ['date']
    raw_id_fields = ['user']
    date_hierarchy = 'date'
    list_editable = ['count']
    list_per_page = 50
    
    fieldsets = (
        ('Swipe Information', {
            'fields': ('user', 'swipe_type', 'count', 'date')
        }),
    )
    
    actions = [
        'reset_count_to_zero', 
        'increment_count_by_one',
        'decrement_count_by_one',
        'delete_old_swipes'
    ]
    
    def get_user_email(self, obj):
        return obj.user.email
    get_user_email.short_description = 'Email'
    get_user_email.admin_order_field = 'user__email'
    
    def get_day_of_week(self, obj):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.date.weekday()]
    get_day_of_week.short_description = 'Day'
    get_day_of_week.admin_order_field = 'date'
    
    def reset_count_to_zero(self, request, queryset):
        """Reset selected swipe counts to zero"""
        updated = queryset.update(count=0)
        self.message_user(request, f"{updated} swipe record(s) reset to 0.")
    reset_count_to_zero.short_description = "Reset count to 0"
    
    def increment_count_by_one(self, request, queryset):
        """Increment selected swipe counts by 1"""
        for obj in queryset:
            obj.count += 1
            obj.save()
        self.message_user(request, f"{queryset.count()} swipe record(s) incremented by 1.")
    increment_count_by_one.short_description = "Increment count by 1"
    
    def decrement_count_by_one(self, request, queryset):
        """Decrement selected swipe counts by 1 (minimum 0)"""
        for obj in queryset:
            obj.count = max(0, obj.count - 1)
            obj.save()
        self.message_user(request, f"{queryset.count()} swipe record(s) decremented by 1.")
    decrement_count_by_one.short_description = "Decrement count by 1 (min 0)"
    
    def delete_old_swipes(self, request, queryset):
        """Delete swipe records older than 30 days"""
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        old_swipes = DailySwipe.objects.filter(date__lt=thirty_days_ago)
        count = old_swipes.count()
        old_swipes.delete()
        self.message_user(request, f"{count} old swipe record(s) deleted (older than 30 days).")
    delete_old_swipes.short_description = "Delete swipes older than 30 days"


# Optional: Register a proxy model for today's swipes
class TodaySwipe(DailySwipe):
    """Proxy model for today's swipes only"""
    class Meta:
        proxy = True
        verbose_name = "Today's Swipe"
        verbose_name_plural = "Today's Swipes"


@admin.register(TodaySwipe)
class TodaySwipeAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'get_user_email', 'swipe_type', 'count']
    list_filter = ['swipe_type', 'user__account_type']
    search_fields = ['user__email', 'user__username']
    raw_id_fields = ['user']
    
    def get_queryset(self, request):
        return super().get_queryset(request).filter(date=timezone.now().date())
    
    def get_user_email(self, obj):
        return obj.user.email
    get_user_email.short_description = 'Email'





    
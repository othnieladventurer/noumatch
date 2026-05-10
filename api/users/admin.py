from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from .models import User, OTP
from .models import UserStats, UserEngagementScore






# Inline for OTP - to show OTP inside user detail page
class OTPInline(admin.TabularInline):
    model = OTP
    fields = ('code', 'created_at', 'is_used', 'attempts')
    readonly_fields = ('code', 'created_at', 'is_used', 'attempts')
    can_delete = False
    extra = 0
    max_num = 1
    
    def has_add_permission(self, request, obj=None):
        return False






@admin.register(UserStats)
class UserStatsAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_likes_given', 'total_likes_received', 'total_matches', 'active_matches', 'last_active')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('updated_at',)
    list_filter = ('active_matches',)


@admin.register(UserEngagementScore)
class UserEngagementScoreAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'overall_score',
        'total_points',
        'engagement_score',
        'quality_score',
        'trust_score',
        'allow_perfect_score',
        'score_cap',
        'last_calculated_at',
    )
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    list_filter = ('allow_perfect_score',)









@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    actions = ("trigger_profile_photo_review", "clear_profile_photo_review")
    
    # Add OTP inline
    inlines = [OTPInline]

    # Custom method to display coordinates nicely - NO HTML TAGS
    def coordinates_display(self, obj):
        if obj.latitude and obj.longitude:
            return f"{obj.latitude}, {obj.longitude}"
        return "-"
    coordinates_display.short_description = "Coordinates"
    coordinates_display.admin_order_field = "latitude"

    # Fields to display in the admin list view
    list_display = (
        "photo_preview",
        "email",
        "username",
        "first_name",
        "last_name",
        "account_type",
        "photo_review_status",
        "photo_review_trigger_count",
        "city",
        "country",
        "coordinates_display",
        "is_verified",
        "is_staff",
        "is_active",
        "date_joined",
    )

    # Add search capability
    search_fields = ("email", "username", "first_name", "last_name", "city", "country")

    # Filters in sidebar
    list_filter = (
        "account_type",
        "is_verified", 
        "is_staff", 
        "is_active", 
        "photo_review_required",
        "gender",
        "country",
    )

    # Fields for creating or editing a user
    fieldsets = (
        ("Login Info", {"fields": ("email", "username", "password")}),
        ("Personal Info", {
            "fields": (
                "first_name",
                "last_name",
                "bio",
                "birth_date",
                "gender",
                "profile_photo",
                "photo_review_required",
                "photo_review_trigger_count",
                "photo_review_required_at",
                "photo_review_reason",
                "height",
                "passions",
                "career",
                "education",
                "hobbies",
                "favorite_music",
                "account_type",
            )
        }),
        ("Location Info", {
            "fields": (
                "location",
                "country",
                "city",
                ("latitude", "longitude"),
            ),
            "classes": ("wide",),
            "description": "📍 Geolocation information automatically captured from IP address during registration"
        }),
        ("Permissions", {"fields": ("is_verified", "is_staff", "is_active", "is_superuser", "groups", "user_permissions")}),
        ("Important Dates", {"fields": ("last_login", "date_joined")}),
    )

    # Fields to use when adding a new user via admin
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "first_name",
                    "last_name",
                    "password1",
                    "password2",
                    "account_type",
                    "is_active",
                    "is_staff"
                ),
            },
        ),
    )

    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions")
    
    # Make latitude and longitude read-only in admin (they're auto-captured)
    readonly_fields = ("latitude", "longitude", "photo_preview", "photo_review_trigger_count", "photo_review_required_at")

    def photo_preview(self, obj):
        if obj.profile_photo:
            return format_html(
                '<img src="{}" alt="{}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid #ddd;" />',
                obj.profile_photo.url,
                obj.email,
            )
        initials = ((obj.first_name or obj.email[:1])[:1] + (obj.last_name or "")[:1]).upper() or "U"
        return format_html(
            '<div style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#f3f4f6;color:#374151;font-weight:700;">{}</div>',
            initials,
        )
    photo_preview.short_description = "Photo"

    def photo_review_status(self, obj):
        if obj.photo_review_required:
            return "Photo update required"
        return "Clear"
    photo_review_status.short_description = "Photo review"

    @admin.action(description="Require users to upload a new profile photo before swiping")
    def trigger_profile_photo_review(self, request, queryset):
        updated = 0
        for user in queryset:
            user.trigger_photo_review_requirement("Triggered from Django admin moderation.")
            updated += 1
        self.message_user(request, f"Photo update requirement triggered for {updated} user(s).")

    @admin.action(description="Clear profile photo update requirement")
    def clear_profile_photo_review(self, request, queryset):
        cleared = 0
        for user in queryset:
            if user.clear_photo_review_requirement():
                cleared += 1
        self.message_user(request, f"Photo update requirement cleared for {cleared} user(s).")

    def save_model(self, request, obj, form, change):
        if change and "photo_review_required" in getattr(form, "changed_data", []):
            previous = User.objects.filter(pk=obj.pk).only(
                "photo_review_required",
                "photo_review_trigger_count",
            ).first()
            if obj.photo_review_required and not getattr(previous, "photo_review_required", False):
                obj.photo_review_trigger_count = int(getattr(previous, "photo_review_trigger_count", 0) or 0) + 1
                obj.photo_review_required_at = timezone.now()
                if not obj.photo_review_reason:
                    obj.photo_review_reason = "Triggered from Django admin moderation."
            elif not obj.photo_review_required:
                obj.photo_review_required_at = None
                obj.photo_review_reason = ""
        super().save_model(request, obj, form, change)


# Optional: Keep OTP admin list view as well
@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ("user", "code", "created_at", "is_used", "attempts")
    list_filter = ("is_used", "created_at")
    search_fields = ("user__email", "code")
    readonly_fields = ("created_at", "code", "user", "attempts")
    
    def has_add_permission(self, request):
        return False







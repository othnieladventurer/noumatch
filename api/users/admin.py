from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTP
from .models import UserStats






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









@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    
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
        "email",
        "username",
        "first_name",
        "last_name",
        "account_type",
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
    readonly_fields = ("latitude", "longitude")


# Optional: Keep OTP admin list view as well
@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ("user", "code", "created_at", "is_used", "attempts")
    list_filter = ("is_used", "created_at")
    search_fields = ("user__email", "code")
    readonly_fields = ("created_at", "code", "user", "attempts")
    
    def has_add_permission(self, request):
        return False







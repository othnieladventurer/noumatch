from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User

    # Fields to display in the admin list view
    list_display = (
        "email",
        "username",
        "is_verified",
        "is_staff",
        "is_active",
        "date_joined",
    )

    # Add search capability for email and username
    search_fields = ("email", "username")

    # Filters in sidebar
    list_filter = ("is_verified", "is_staff", "is_active", "gender", "interested_in")

    # Fields for creating or editing a user
    fieldsets = (
        ("Login Info", {"fields": ("email", "username", "password")}),
        ("Personal Info", {
            "fields": (
                "bio",
                "birth_date",
                "gender",
                "interested_in",
                "location",
                "profile_photo",
                "height",
                "passions",
                "career",
                "education",
                "hobbies",
                "favorite_music",
            )
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
                "fields": ("email", "username", "password1", "password2", "is_active", "is_staff"),
            },
        ),
    )

    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions")
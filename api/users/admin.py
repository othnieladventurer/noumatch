from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User

    # Fields to display in the admin list view - added account_type
    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "account_type",  # Added account type
        "is_verified",
        "is_staff",
        "is_active",
        "date_joined",
    )

    # Add search capability for email and username, plus first/last name
    search_fields = ("email", "username", "first_name", "last_name")

    # Filters in sidebar - added account_type
    list_filter = (
        "account_type",  # Added account type filter
        "is_verified", 
        "is_staff", 
        "is_active", 
        "gender", 
 
    )

    # Fields for creating or editing a user - added account_type to Personal Info
    fieldsets = (
        ("Login Info", {"fields": ("email", "username", "password")}),
        ("Personal Info", {
            "fields": (
                "first_name",
                "last_name",
                "bio",
                "birth_date",
                "gender",
              
                "location",
                "profile_photo",
                "height",
                "passions",
                "career",
                "education",
                "hobbies",
                "favorite_music",
                "account_type",  # Added account type here
            )
        }),
        ("Permissions", {"fields": ("is_verified", "is_staff", "is_active", "is_superuser", "groups", "user_permissions")}),
        ("Important Dates", {"fields": ("last_login", "date_joined")}),
    )

    # Fields to use when adding a new user via admin - added account_type
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
                    "account_type",  # Added account type to add form
                    "is_active",
                    "is_staff"
                ),
            },
        ),
    )

    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions")



    
from django.contrib import admin
from .models import WaitlistEntry, WaitlistStats


@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "first_name",
        "last_name",
        "email",
        "gender",
        "is_accepted",
        "position",
        "joined_at",
        "accepted_at",
    )
    list_filter = (
        "gender",
        "is_accepted",
        "joined_at",
        "accepted_at",
    )
    search_fields = (
        "first_name",
        "last_name",
        "email",
    )
    ordering = ("joined_at",)
    readonly_fields = ("position", "joined_at", "accepted_at")

    fieldsets = (
        ("Informations personnelles", {
            "fields": (
                "first_name",
                "last_name",
                "email",
                "gender",
            )
        }),
        ("Statut liste d'attente", {
            "fields": (
                "is_accepted",
                "position",
                "joined_at",
                "accepted_at",
            )
        }),
    )

    actions = ["mark_as_accepted", "mark_as_waiting"]

    def save_model(self, request, obj, form, change):
        if obj.is_accepted and obj.accepted_at is None:
            from django.utils import timezone
            obj.accepted_at = timezone.now()
        elif not obj.is_accepted:
            obj.accepted_at = None
        super().save_model(request, obj, form, change)

    @admin.action(description="Marquer comme accepté")
    def mark_as_accepted(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(is_accepted=True, accepted_at=timezone.now())
        self.message_user(
            request,
            f"{updated} inscription(s) marquée(s) comme acceptée(s)."
        )

    @admin.action(description="Remettre en attente")
    def mark_as_waiting(self, request, queryset):
        updated = queryset.update(is_accepted=False, accepted_at=None)
        self.message_user(
            request,
            f"{updated} inscription(s) remise(s) en attente."
        )


@admin.register(WaitlistStats)
class WaitlistStatsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "total_men_waiting",
        "total_women_waiting",
        "total_men_accepted",
        "total_women_accepted",
        "target_women_percentage",
        "target_men_percentage",
        "updated_at",
    )
    readonly_fields = (
        "total_men_waiting",
        "total_women_waiting",
        "total_men_accepted",
        "total_women_accepted",
        "updated_at",
    )

    fieldsets = (
        ("Statistiques actuelles", {
            "fields": (
                "total_men_waiting",
                "total_women_waiting",
                "total_men_accepted",
                "total_women_accepted",
                "updated_at",
            )
        }),
        ("Objectifs de répartition", {
            "fields": (
                "target_women_percentage",
                "target_men_percentage",
            )
        }),
    )

    def has_add_permission(self, request):
        return not WaitlistStats.objects.exists()




        
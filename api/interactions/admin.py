from django.contrib import admin
from .models import Like

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_user', 'to_user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('from_user__username', 'to_user__username')



    
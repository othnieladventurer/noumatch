from django.contrib import admin
from .models import Conversation, Message



# In your admin.py
@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'match', 'created_at', 'first_message_at', 'last_message_at', 'has_started']
    list_filter = ['first_message_at', 'last_message_at']
    search_fields = ['match__user1__email', 'match__user2__email']
    readonly_fields = ['created_at', 'updated_at', 'first_message_at', 'last_message_at']
    
    fieldsets = (
        ('Match Information', {
            'fields': ('match',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'first_message_at', 'last_message_at')
        }),
    )







    
@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'short_content', 'read', 'created_at')
    list_filter = ('read', 'created_at')
    search_fields = ('sender__email', 'sender__username', 'content')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Message Info', {
            'fields': ('conversation', 'sender', 'content')
        }),
        ('Status', {
            'fields': ('read',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def short_content(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    short_content.short_description = 'Content'
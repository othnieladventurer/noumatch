from django.contrib import admin
from .models import Conversation, Message

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'match', 'get_user1', 'get_user2', 'created_at', 'updated_at', 'get_message_count')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('match__user1__email', 'match__user1__username', 'match__user2__email', 'match__user2__username')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-updated_at',)
    
    fieldsets = (
        ('Conversation Info', {
            'fields': ('match',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_user1(self, obj):
        return obj.match.user1.email
    get_user1.short_description = 'User 1'
    get_user1.admin_order_field = 'match__user1__email'
    
    def get_user2(self, obj):
        return obj.match.user2.email
    get_user2.short_description = 'User 2'
    get_user2.admin_order_field = 'match__user2__email'
    
    def get_message_count(self, obj):
        return obj.messages.count()
    get_message_count.short_description = 'Messages'
    get_message_count.admin_order_field = 'messages'


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
# notifications/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType




class Notification(models.Model):
    class Type(models.TextChoices):
        # Welcome
        WELCOME = 'welcome', 'Welcome to NouMatch'
        
        # Interactions
        NEW_LIKE = 'new_like', 'New Like'
        NEW_MATCH = 'new_match', 'New Match'
        NEW_MESSAGE = 'new_message', 'New Message'
        
        # Reports
        REPORT_RECEIVED = 'report_received', 'Report Received'
        REPORT_REVIEWED = 'report_reviewed', 'Report Reviewed'
        REPORT_ACTION_TAKEN = 'report_action_taken', 'Action Taken on Report'
        
        # System/Custom
        SYSTEM = 'system', 'System Notification'
        PROMOTIONAL = 'promotional', 'Promotional'
        REMINDER = 'reminder', 'Reminder'
    
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'
    
    # Recipient
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Notification content
    type = models.CharField(
        max_length=30,
        choices=Type.choices,
        db_index=True
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Optional link/action
    link = models.CharField(max_length=500, blank=True)
    link_text = models.CharField(max_length=100, blank=True, default="View")
    
    # Related object (like, match, message, report)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    related_object = GenericForeignKey('content_type', 'object_id')
    
    # Metadata
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    icon = models.CharField(max_length=50, blank=True, default="bell")
    
    # Status
    is_read = models.BooleanField(default=False)
    is_seen = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['recipient', 'type', 'object_id'],
                name='unique_notification_per_object'
            )
        ]

        
    indexes = [
        models.Index(fields=['recipient', '-created_at']),
        models.Index(fields=['recipient', 'is_read', '-created_at']),
        models.Index(fields=['type']),
        models.Index(fields=['created_at']),
    ]
    
    def __str__(self):
        return f"{self.recipient.email} - {self.type} - {self.created_at}"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def mark_as_seen(self):
        if not self.is_seen:
            self.is_seen = True
            self.save(update_fields=['is_seen'])
    
    @classmethod
    def get_unread_count(cls, user):
        return cls.objects.filter(recipient=user, is_read=False).count()
    
    @classmethod
    def mark_all_as_read(cls, user):
        return cls.objects.filter(recipient=user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )



        
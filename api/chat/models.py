from django.db import models
from django.conf import settings
from django.utils import timezone
from matches.models import Match  # Import your existing Match model




class Conversation(models.Model):
    """
    Represents a chat conversation between two users (linked to a match)
    """
    match = models.OneToOneField(
        Match,
        on_delete=models.CASCADE,
        related_name='conversation',
        help_text="The match that created this conversation"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    first_message_at = models.DateTimeField(null=True, blank=True)  # 👈 ADD THIS
    last_message_at = models.DateTimeField(null=True, blank=True)   # 👈 ADD THIS
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Conversation for Match #{self.match.id}"
    
    def get_participants(self):
        """Return both users in the conversation"""
        return [self.match.user1, self.match.user2]
    
    def get_other_user(self, user):
        """Return the other user in the conversation"""
        if user == self.match.user1:
            return self.match.user2
        elif user == self.match.user2:
            return self.match.user1
        return None
    
    def last_message(self):
        """Return the most recent message in this conversation"""
        return self.messages.order_by('-created_at').first()
    
    def unread_count(self, user):
        """Return number of unread messages for a specific user"""
        return self.messages.filter(
            ~models.Q(sender=user),  # Not sent by this user
            read=False                # Not read yet
        ).count()
    
    def has_started(self):
        """Check if conversation has started (at least one message)"""
        return self.first_message_at is not None




class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    content = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message from {self.sender.email} at {self.created_at}"
    
    def mark_as_read(self):
        """Mark message as read"""
        if not self.read:
            self.read = True
            self.save(update_fields=['read'])
    
    # 👇 ADD THIS SAVE METHOD
    def save(self, *args, **kwargs):
        is_new = not self.pk  # Check if this is a new message
        
        super().save(*args, **kwargs)  # Save the message first
        
        if is_new:
            # Update conversation timestamps
            conversation = self.conversation
            
            # If this is the first message, set first_message_at
            if conversation.messages.count() == 1:
                conversation.first_message_at = self.created_at
            
            # Always update last_message_at
            conversation.last_message_at = self.created_at
            conversation.save(update_fields=['first_message_at', 'last_message_at', 'updated_at'])




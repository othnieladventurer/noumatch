from django.db import models
from django.conf import settings
from django.utils import timezone
from matches.models import Match
from django.contrib.auth import get_user_model
User = get_user_model()

User = settings.AUTH_USER_MODEL


class Conversation(models.Model):
    match = models.OneToOneField(Match, on_delete=models.CASCADE, related_name='conversation')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    first_message_at = models.DateTimeField(null=True, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation for Match #{self.match.id}"

    def get_participants(self):
        return [self.match.user1, self.match.user2]

    def get_other_user(self, user):
        return self.match.user2 if user == self.match.user1 else self.match.user1

    def last_message(self):
        return self.messages.order_by('-created_at').first()

    def unread_count(self, user):
        return self.messages.filter(~models.Q(sender=user), read=False).count()

    def has_started(self):
        return self.first_message_at is not None

    def message_count_per_user(self):
        counts = {}
        for msg in self.messages.all():
            counts[msg.sender_id] = counts.get(msg.sender_id, 0) + 1
        return counts

    def is_one_sided(self, threshold=5):
        counts = self.message_count_per_user()
        if len(counts) != 2:
            return False
        return abs(list(counts.values())[0] - list(counts.values())[1]) > threshold


class SupportConversation(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('pending', 'Pending'),
        ('closed', 'Closed'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_conversations')
    assigned_admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_support_conversations')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Support for {self.user.email} ({self.status})"

    def last_message(self):
        return self.messages.order_by('-created_at').first()



class Message(models.Model):
    SENDER_TYPES = (
        ('user', 'User'),
        ('admin', 'Admin'),
        ('system', 'System'),
    )
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, null=True, blank=True, related_name='messages')
    support_conversation = models.ForeignKey(SupportConversation, on_delete=models.CASCADE, null=True, blank=True, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='sent_messages')
    sender_type = models.CharField(max_length=10, choices=SENDER_TYPES, default='user')
    content = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at']
        constraints = [
            models.CheckConstraint(
                condition=(  # ✅ use 'condition' not 'check'
                    models.Q(conversation__isnull=False, support_conversation__isnull=True) |
                    models.Q(conversation__isnull=True, support_conversation__isnull=False)
                ),
                name='message_belongs_to_one_conversation'
            )
        ]

    def __str__(self):
        return f"Message from {self.sender.email if self.sender else 'system'} at {self.created_at}"

    def mark_as_read(self):
        if not self.read:
            self.read = True
            self.save(update_fields=['read'])

    def save(self, *args, **kwargs):
        is_new = not self.pk
        super().save(*args, **kwargs)
        if is_new and self.conversation:
            conv = self.conversation
            if conv.messages.count() == 1:
                conv.first_message_at = self.created_at
            conv.last_message_at = self.created_at
            conv.updated_at = timezone.now()
            conv.save(update_fields=['first_message_at', 'last_message_at', 'updated_at'])



            

class MessageFlag(models.Model):
    REASON_CHOICES = (
        ('spam', 'Spam'),
        ('harassment', 'Harassment'),
        ('threat', 'Threat'),
        ('abuse', 'Abuse'),
    )
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='flags')
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    score = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Flag on message {self.message.id} – {self.reason}"




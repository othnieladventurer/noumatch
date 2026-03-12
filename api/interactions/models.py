from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError



class Like(models.Model):
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='likes_sent'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='likes_received'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')  # prevent duplicate likes
        ordering = ['-created_at']

    def clean(self):
        if self.from_user == self.to_user:
            raise ValidationError("You cannot like yourself.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)










class Pass(models.Model):
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passes_sent'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passes_received'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Optional: Add expiry date if passes expire after some time
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('from_user', 'to_user')  # prevent duplicate passes
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['from_user', 'created_at']),
            models.Index(fields=['to_user', 'created_at']),
        ]

    def clean(self):
        if self.from_user == self.to_user:
            raise ValidationError("You cannot pass on yourself.")
        
        # Optional: Check if user has already liked this person
        from .models import Like
        if Like.objects.filter(from_user=self.from_user, to_user=self.to_user).exists():
            raise ValidationError("You cannot pass on someone you've already liked.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.from_user} passed on {self.to_user} at {self.created_at}"


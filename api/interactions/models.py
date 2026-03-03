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




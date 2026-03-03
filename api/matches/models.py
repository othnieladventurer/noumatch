from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class Match(models.Model):
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='matches_as_user1'
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='matches_as_user2'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user1', 'user2')
        ordering = ['-created_at']

    def clean(self):
        if self.user1 == self.user2:
            raise ValidationError("Cannot match with yourself.")

    def save(self, *args, **kwargs):
        # Ensure user1_id < user2_id to avoid duplicates
        if self.user1_id and self.user2_id and self.user1_id > self.user2_id:
            self.user1, self.user2 = self.user2, self.user1
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Match: {self.user1.username} & {self.user2.username}"
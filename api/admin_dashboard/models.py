# admin_dashboard/models.py
from django.db import models
from django.conf import settings




class ProfileImpression(models.Model):
    SWIPE_CHOICES = [
        ('like', 'Like'),
        ('pass', 'Pass'),
        ('none', 'None'),
    ]

    viewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='impressions_made')
    viewed = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='impressions_received')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    feed_position = models.PositiveSmallIntegerField()
    ranking_score = models.FloatField()
    session_id = models.CharField(max_length=64, db_index=True)
    device_type = models.CharField(max_length=20, blank=True, null=True)
    was_swiped = models.BooleanField(default=False)
    swipe_action = models.CharField(max_length=10, choices=SWIPE_CHOICES, default='none')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['viewer', 'timestamp']),
            models.Index(fields=['viewed', 'timestamp']),
            models.Index(fields=['session_id', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.viewer.email} viewed {self.viewed.email} at {self.timestamp}"




        
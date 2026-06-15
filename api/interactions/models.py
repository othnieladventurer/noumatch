from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone


class Like(models.Model):
    LIKE_TYPES = [
        ('like', 'Like'),
        ('coup_de_coeur', 'Coup de Coeur'),
    ]

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
    notification_sent = models.BooleanField(default=False)
    type = models.CharField(max_length=20, choices=LIKE_TYPES, default='like')

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
            models.Index(fields=['expires_at']),
        ]

    def clean(self):
        if self.from_user == self.to_user:
            raise ValidationError("You cannot pass on yourself.")
        
        from .models import Like
        if Like.objects.filter(from_user=self.from_user, to_user=self.to_user).exists():
            raise ValidationError("You cannot pass on someone you've already liked.")

    def save(self, *args, **kwargs):
        # Get expiry hours from settings default to 72 if not set
        expiry_hours = getattr(settings, 'PASS_EXPIRY_HOURS', 72)
        
        # Auto-set expiry
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(hours=expiry_hours)
        
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.from_user} passed on {self.to_user} at {self.created_at}"




class DailySwipe(models.Model):
    SWIPE_TYPES = [
        ('like', 'Like'),
        ('pass', 'Pass'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_swipes'
    )
    swipe_type = models.CharField(
        max_length=10,
        choices=SWIPE_TYPES
    )
    count = models.PositiveIntegerField(default=0)
    date = models.DateField(default=timezone.now)
    
    class Meta:
        unique_together = ('user', 'swipe_type', 'date')
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'swipe_type', 'date']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.user.email} - {self.swipe_type} - {self.date}: {self.count}"

    @classmethod
    def increment_swipe(cls, user, swipe_type):
        today = timezone.now().date()
        swipe, created = cls.objects.get_or_create(
            user=user,
            swipe_type=swipe_type,
            date=today,
            defaults={'count': 1}
        )
        if not created:
            swipe.count += 1
            swipe.save()
        return swipe

    @classmethod
    def get_today_count(cls, user, swipe_type):
        today = timezone.now().date()
        try:
            swipe = cls.objects.get(user=user, swipe_type=swipe_type, date=today)
            return swipe.count
        except cls.DoesNotExist:
            return 0


class DailyCoeur(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_coeurs'
    )
    date = models.DateField()
    used_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('user', 'date')

    @staticmethod
    def _haiti_today():
        from datetime import timezone as dt_tz, timedelta as dt_td
        return timezone.now().astimezone(dt_tz(dt_td(hours=-5))).date()

    @classmethod
    def get_daily_limit(cls, user):
        base = getattr(settings, 'COUP_DE_COEUR_BASE_LIMIT', 3)
        bonus = getattr(user, 'referral_coeur_bonus', 0)
        return min(base + bonus, getattr(settings, 'COUP_DE_COEUR_MAX_LIMIT', 5))

    @classmethod
    def get_or_create_today(cls, user):
        record, _ = cls.objects.get_or_create(user=user, date=cls._haiti_today())
        return record

    @classmethod
    def remaining(cls, user):
        record = cls.get_or_create_today(user)
        return max(0, cls.get_daily_limit(user) - record.used_count)

    @classmethod
    def can_use(cls, user):
        return cls.remaining(user) > 0

    @classmethod
    def increment(cls, user):
        record = cls.get_or_create_today(user)
        record.used_count += 1
        record.save(update_fields=['used_count'])
        return record



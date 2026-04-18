from django.utils import timezone
from datetime import timedelta
from .models import Like




def get_likes_last_12_hours(user):
    """Return number of likes made by user in the last 12 hours"""
    twelve_hours_ago = timezone.now() - timedelta(hours=12)
    return Like.objects.filter(from_user=user, created_at__gte=twelve_hours_ago).count()

    
# interactions/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Like, Pass
from notifications.utils import send_like_notification
from matches.models import Match

@receiver(post_save, sender=Like)
def like_created_handler(sender, instance, created, **kwargs):
    """Send notification when someone likes your profile"""
    if created:
        send_like_notification(instance)

@receiver(post_save, sender=Match)
def match_created_handler(sender, instance, created, **kwargs):
    """Send notification when users match"""
    if created:
        from notifications.utils import send_match_notification
        send_match_notification(instance, instance.user1, instance.user2)

        
# matches/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Match
from notifications.utils import send_match_notification

@receiver(post_save, sender=Match, dispatch_uid='match_notification_signal')
def match_created_handler(sender, instance, created, **kwargs):
    """Send notifications to both users when a new match is created"""
    if created:
        print(f"🔔 MATCH CREATED: {instance.id} between {instance.user1_id} and {instance.user2_id}")
        send_match_notification(instance, instance.user1, instance.user2)


        
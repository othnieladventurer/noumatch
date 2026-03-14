# interactions/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Like
from notifications.utils import send_like_notification

@receiver(post_save, sender=Like)
def like_created_handler(sender, instance, created, **kwargs):
    """Send notification when someone likes your profile"""
    if created:
        print(f"🔔 SIGNAL TRIGGERED: Like {instance.id} created")
        send_like_notification(instance)
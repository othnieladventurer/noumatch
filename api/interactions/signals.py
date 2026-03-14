# interactions/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from interactions.models import Like
from notifications.utils import send_like_notification

@receiver(post_save, sender=Like, dispatch_uid='unique_like_signal')
def like_created_handler(sender, instance, created, **kwargs):
    if created:
        print(f"🔔 Signal triggered for like {instance.id}")
        send_like_notification(instance)
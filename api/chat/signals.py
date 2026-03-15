# chat/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message
from notifications.utils import send_message_notification

@receiver(post_save, sender=Message, dispatch_uid='message_notification_signal')
def message_created_handler(sender, instance, created, **kwargs):
    """Send a notification when a new message is created."""
    if created:
        print(f"📨 [SIGNAL] message_created_handler called for message {instance.id}")
        send_message_notification(instance)


        
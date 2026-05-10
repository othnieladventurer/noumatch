import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Message
from notifications.utils import send_message_notification


@receiver(post_save, sender=Message, dispatch_uid='message_notification_signal')
def message_created_handler(sender, instance, created, **kwargs):
    """Send a notification only after the message transaction commits."""
    if created:
        logging.info("message_created_handler called for message %s", instance.id)
        transaction.on_commit(lambda: send_message_notification(instance))

from django.contrib.auth.signals import user_logged_out
from django.dispatch import receiver
from .models import *
from django.db.models.signals import post_save, post_delete

@receiver(user_logged_out)
def set_user_offline(sender, request, user, **kwargs):
    """Set user as offline when they log out"""
    if user:
        user.is_online = False
        user.save(update_fields=['is_online'])





@receiver(post_save, sender=User)
def create_user_stats(sender, instance, created, **kwargs):
    if created:
        UserStats.objects.create(user=instance)




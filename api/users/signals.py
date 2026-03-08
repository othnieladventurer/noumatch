from django.contrib.auth.signals import user_logged_out
from django.dispatch import receiver

@receiver(user_logged_out)
def set_user_offline(sender, request, user, **kwargs):
    """Set user as offline when they log out"""
    if user:
        user.is_online = False
        user.save(update_fields=['is_online'])

        
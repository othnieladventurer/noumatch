from django.contrib.auth.signals import user_logged_out
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from block.models import Block
from chat.models import Message
from interactions.models import Like, Pass
from matches.models import Match
from report.models import Report
from users.models import User, UserStats
from users.scoring import refresh_user_score


def _refresh_by_user_ids(user_ids):
    ids = [uid for uid in set(user_ids) if uid]
    if not ids:
        return
    for user in User.objects.filter(id__in=ids):
        refresh_user_score(user)


@receiver(user_logged_out)
def set_user_offline(sender, request, user, **kwargs):
    if user:
        user.is_online = False
        user.save(update_fields=["is_online"])


@receiver(post_save, sender=User)
def create_user_stats(sender, instance, created, update_fields=None, **kwargs):
    if created:
        UserStats.objects.get_or_create(user=instance)
        refresh_user_score(instance)
        return

    # Skip noisy heartbeat-only writes.
    if update_fields and set(update_fields).issubset({"last_activity", "is_online"}):
        return
    refresh_user_score(instance)


@receiver(post_save, sender=Like)
def score_on_like_saved(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.from_user_id, instance.to_user_id])


@receiver(post_delete, sender=Like)
def score_on_like_deleted(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.from_user_id, instance.to_user_id])


@receiver(post_save, sender=Pass)
def score_on_pass_saved(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.from_user_id, instance.to_user_id])


@receiver(post_delete, sender=Pass)
def score_on_pass_deleted(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.from_user_id, instance.to_user_id])


@receiver(post_save, sender=Match)
def score_on_match_saved(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.user1_id, instance.user2_id])


@receiver(post_delete, sender=Match)
def score_on_match_deleted(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.user1_id, instance.user2_id])


@receiver(post_save, sender=Message)
def score_on_message_saved(sender, instance, created, **kwargs):
    user_ids = []
    if instance.sender_id:
        user_ids.append(instance.sender_id)
    if instance.conversation_id:
        conv = instance.conversation
        user_ids.extend([conv.match.user1_id, conv.match.user2_id])
    _refresh_by_user_ids(user_ids)


@receiver(post_delete, sender=Message)
def score_on_message_deleted(sender, instance, **kwargs):
    user_ids = []
    if instance.sender_id:
        user_ids.append(instance.sender_id)
    if instance.conversation_id:
        conv = instance.conversation
        user_ids.extend([conv.match.user1_id, conv.match.user2_id])
    _refresh_by_user_ids(user_ids)


@receiver(post_save, sender=Block)
def score_on_block_saved(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.blocker_id, instance.blocked_id])


@receiver(post_delete, sender=Block)
def score_on_block_deleted(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.blocker_id, instance.blocked_id])


@receiver(post_save, sender=Report)
def score_on_report_saved(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.reporter_id, instance.reported_user_id])


@receiver(post_delete, sender=Report)
def score_on_report_deleted(sender, instance, **kwargs):
    _refresh_by_user_ids([instance.reporter_id, instance.reported_user_id])


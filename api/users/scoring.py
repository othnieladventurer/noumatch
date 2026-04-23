from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from admin_dashboard.models import ProfileImpression
from block.models import Block
from chat.models import Conversation, Message, MessageFlag
from interactions.models import Like
from matches.models import Match
from report.models import Report
from users.models import UserEngagementScore


ONBOARDING_REGISTRATION_POINTS = 20
ONBOARDING_VERIFIED_POINTS = 15
ONBOARDING_PROFILE_60_POINTS = 20
ONBOARDING_PROFILE_80_POINTS = 20
ONBOARDING_PROFILE_100_POINTS = 30
ONBOARDING_FIRST_3_PHOTOS_POINTS = 20
ONBOARDING_LONG_BIO_POINTS = 10


def clamp(value, low, high):
    return max(low, min(high, value))


def _completed_profile_fields_count(user):
    fields = [
        bool(user.first_name),
        bool(user.last_name),
        bool(user.birth_date),
        bool(user.gender),
        bool(user.city),
        bool(user.country),
        bool(user.profile_photo),
        bool((user.bio or "").strip()),
        bool((user.passions or "").strip()),
        bool((user.hobbies or "").strip()),
        bool((user.career or "").strip()),
        bool((user.education or "").strip()),
        bool((user.favorite_music or "").strip()),
    ]
    return sum(1 for ok in fields if ok), len(fields)


def _active_days_and_streak(user, now):
    start_30 = now - timedelta(days=30)
    day_set = set()

    if user.last_login and user.last_login >= start_30:
        day_set.add(user.last_login.date())

    for day in Like.objects.filter(from_user=user, created_at__gte=start_30).values_list("created_at__date", flat=True):
        day_set.add(day)
    for day in Message.objects.filter(
        sender=user,
        sender_type="user",
        created_at__gte=start_30,
    ).values_list("created_at__date", flat=True):
        day_set.add(day)
    for day in ProfileImpression.objects.filter(
        viewer=user,
        timestamp__gte=start_30,
    ).values_list("timestamp__date", flat=True):
        day_set.add(day)

    active_days_30 = len(day_set)
    streak = 0
    cursor = now.date()
    while cursor in day_set:
        streak += 1
        cursor = cursor - timedelta(days=1)

    return active_days_30, streak


def refresh_user_score(user):
    now = timezone.now()
    scorecard, _ = UserEngagementScore.objects.get_or_create(user=user)

    complete_fields, total_fields = _completed_profile_fields_count(user)
    profile_completion_percent = int(round((complete_fields / total_fields) * 100)) if total_fields else 0
    photo_count = user.photos.count()
    bio_length = len((user.bio or "").strip())

    onboarding_points = ONBOARDING_REGISTRATION_POINTS
    if user.is_verified:
        onboarding_points += ONBOARDING_VERIFIED_POINTS
    if profile_completion_percent >= 60:
        onboarding_points += ONBOARDING_PROFILE_60_POINTS
    if profile_completion_percent >= 80:
        onboarding_points += ONBOARDING_PROFILE_80_POINTS
    if profile_completion_percent >= 100:
        onboarding_points += ONBOARDING_PROFILE_100_POINTS
    if photo_count >= 3:
        onboarding_points += ONBOARDING_FIRST_3_PHOTOS_POINTS
    if bio_length >= 120:
        onboarding_points += ONBOARDING_LONG_BIO_POINTS

    day_ago = now - timedelta(hours=24)
    views_24h = ProfileImpression.objects.filter(viewer=user, timestamp__gte=day_ago).count()
    likes_24h = Like.objects.filter(from_user=user, created_at__gte=day_ago).count()
    messages_24h = Message.objects.filter(
        sender=user,
        sender_type="user",
        created_at__gte=day_ago,
    ).count()
    login_bonus = 5 if user.last_login and user.last_login >= day_ago else 0
    daily_active_bonus = 15 if (likes_24h + views_24h + messages_24h + (1 if login_bonus else 0)) >= 3 else 0

    activity_points = (
        login_bonus
        + min(views_24h, 20) * 1
        + min(likes_24h, 20) * 2
        + min(messages_24h, 15) * 4
        + daily_active_bonus
    )

    active_days_30, streak_days = _active_days_and_streak(user, now)
    engagement_score = clamp(
        int(round(min(activity_points, 120) / 120 * 70 + min(active_days_30, 30) / 30 * 20 + min(streak_days, 14) / 14 * 10)),
        0,
        100,
    )

    likes_total = Like.objects.filter(from_user=user).count()
    matches_total = Match.objects.filter(Q(user1=user) | Q(user2=user)).count()
    like_match_ratio = (matches_total / likes_total) if likes_total else 0.0

    convs = Conversation.objects.filter(Q(match__user1=user) | Q(match__user2=user)).annotate(
        my_messages=Count("messages", filter=Q(messages__sender=user, messages__sender_type="user")),
        other_messages=Count("messages", filter=Q(messages__sender_type="user") & ~Q(messages__sender=user)),
        total_user_messages=Count("messages", filter=Q(messages__sender_type="user")),
    )
    conv_count = convs.count()
    two_way_count = convs.filter(my_messages__gt=0, other_messages__gt=0).count()
    deep_count = convs.filter(my_messages__gte=2, other_messages__gte=2, total_user_messages__gte=4).count()
    reply_rate = (two_way_count / conv_count) if conv_count else 0.0
    depth_rate = (deep_count / conv_count) if conv_count else 0.0

    quality_score = clamp(
        int(round(min(like_match_ratio, 1.0) * 40 + min(reply_rate, 1.0) * 35 + min(depth_rate, 1.0) * 25)),
        0,
        100,
    )
    quality_points = int(round(quality_score * 0.6))

    reports_received = Report.objects.filter(reported_user=user).exclude(status="dismissed").count()
    blocks_received = Block.objects.filter(blocked=user).count()
    message_flags = MessageFlag.objects.filter(message__sender=user).count()

    trust_penalty = reports_received * 12 + blocks_received * 4 + message_flags * 8
    trust_score = clamp(100 - trust_penalty + (5 if user.is_verified else 0), 0, 100)
    penalty_points = reports_received * 15 + blocks_received * 5 + message_flags * 10

    freshness_boost = 0
    if user.date_joined >= now - timedelta(days=3):
        freshness_boost += 10
    elif user.last_activity and user.last_activity >= now - timedelta(days=2):
        freshness_boost += 4

    computed_overall = int(round(0.35 * engagement_score + 0.45 * quality_score + 0.20 * trust_score + freshness_boost))
    if scorecard.allow_perfect_score:
        cap = 100
    else:
        cap = clamp(scorecard.score_cap or 99, 1, 99)
    overall_score = clamp(computed_overall, 0, cap)

    total_points = max(0, onboarding_points + activity_points + quality_points - penalty_points)

    scorecard.onboarding_points = onboarding_points
    scorecard.activity_points = activity_points
    scorecard.quality_points = quality_points
    scorecard.penalty_points = penalty_points
    scorecard.total_points = total_points
    scorecard.profile_completion_percent = profile_completion_percent
    scorecard.engagement_score = engagement_score
    scorecard.quality_score = quality_score
    scorecard.trust_score = trust_score
    scorecard.overall_score = overall_score
    scorecard.last_calculated_at = now
    scorecard.breakdown = {
        "likes_24h": likes_24h,
        "views_24h": views_24h,
        "messages_24h": messages_24h,
        "daily_active_bonus": daily_active_bonus,
        "active_days_30": active_days_30,
        "streak_days": streak_days,
        "likes_total": likes_total,
        "matches_total": matches_total,
        "like_match_ratio": round(like_match_ratio, 4),
        "conversation_count": conv_count,
        "two_way_conversations": two_way_count,
        "deep_conversations": deep_count,
        "reply_rate": round(reply_rate, 4),
        "depth_rate": round(depth_rate, 4),
        "reports_received": reports_received,
        "blocks_received": blocks_received,
        "message_flags": message_flags,
        "freshness_boost": freshness_boost,
    }
    scorecard.save(
        update_fields=[
            "onboarding_points",
            "activity_points",
            "quality_points",
            "penalty_points",
            "total_points",
            "profile_completion_percent",
            "engagement_score",
            "quality_score",
            "trust_score",
            "overall_score",
            "last_calculated_at",
            "breakdown",
            "updated_at",
        ]
    )
    return scorecard


def get_user_score_snapshot(user):
    scorecard = getattr(user, "engagement_scorecard", None) or refresh_user_score(user)
    return {
        "overall_score": scorecard.overall_score,
        "engagement_score": scorecard.engagement_score,
        "quality_score": scorecard.quality_score,
        "trust_score": scorecard.trust_score,
        "total_points": scorecard.total_points,
        "profile_completion_percent": scorecard.profile_completion_percent,
        "allow_perfect_score": scorecard.allow_perfect_score,
        "score_cap": scorecard.score_cap,
        "breakdown": scorecard.breakdown,
        "last_calculated_at": scorecard.last_calculated_at,
    }


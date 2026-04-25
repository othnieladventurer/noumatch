from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from admin_dashboard.models import ProfileImpression
from matches.models import Match
from users.models import FeedVisibilityBoost, User


def _product_users_queryset():
    test_user_q = (
        Q(email__icontains="test")
        | Q(email__icontains="demo")
        | Q(email__icontains="staging")
        | Q(email__iendswith="@example.com")
    )
    return User.objects.filter(is_active=True, is_staff=False, is_superuser=False).exclude(test_user_q)


def get_active_users(limit=20, exclude_ids=None):
    now = timezone.now()
    qs = _product_users_queryset().filter(last_activity__gte=now - timedelta(hours=2))
    if exclude_ids:
        qs = qs.exclude(id__in=set(exclude_ids))
    return list(qs.order_by("-last_activity")[:limit])


def upsert_visibility_boost(
    viewer,
    target,
    source,
    boost_score=70,
    remaining_views=8,
    ttl_minutes=180,
):
    if not viewer or not target or viewer.id == target.id:
        return None
    now = timezone.now()
    expires_at = now + timedelta(minutes=ttl_minutes)
    boost, created = FeedVisibilityBoost.objects.get_or_create(
        viewer=viewer,
        target=target,
        source=source,
        defaults={
            "boost_score": boost_score,
            "remaining_views": remaining_views,
            "expires_at": expires_at,
        },
    )
    if not created:
        if boost_score >= 0:
            boost.boost_score = max(boost.boost_score, boost_score)
            boost.remaining_views = max(boost.remaining_views, remaining_views)
        else:
            boost.boost_score = min(boost.boost_score, boost_score)
            boost.remaining_views = max(boost.remaining_views, remaining_views)
        boost.expires_at = max(boost.expires_at, expires_at)
        boost.save(update_fields=["boost_score", "remaining_views", "expires_at", "updated_at"])
    return boost


def inject_new_user_visibility(user, limit=20):
    active_users = get_active_users(limit=limit, exclude_ids=[user.id])
    created = 0
    for target in active_users:
        if upsert_visibility_boost(
            viewer=target,
            target=user,
            source="new_user_injection",
            boost_score=95,
            remaining_views=12,
            ttl_minutes=240,
        ):
            created += 1
        if upsert_visibility_boost(
            viewer=user,
            target=target,
            source="new_user_reciprocal",
            boost_score=55,
            remaining_views=8,
            ttl_minutes=180,
        ):
            created += 1
    return created


def inject_underexposed_recovery(user, limit=10):
    if Match.objects.filter(Q(user1=user) | Q(user2=user)).exists():
        return 0
    now = timezone.now()
    impressions_24h = ProfileImpression.objects.filter(
        viewed=user,
        timestamp__gte=now - timedelta(hours=24),
    ).count()
    if impressions_24h >= 10:
        return 0

    active_users = get_active_users(limit=limit, exclude_ids=[user.id])
    created = 0
    for target in active_users:
        if upsert_visibility_boost(
            viewer=target,
            target=user,
            source="underexposed_recovery",
            boost_score=85,
            remaining_views=10,
            ttl_minutes=180,
        ):
            created += 1
    return created


def inject_like_reciprocal_visibility(liker, liked):
    already_seen = ProfileImpression.objects.filter(
        viewer=liked,
        viewed=liker,
        timestamp__gte=timezone.now() - timedelta(days=14),
    ).exists()
    if already_seen:
        return 0
    boost = upsert_visibility_boost(
        viewer=liked,
        target=liker,
        source="mutual_like_stack",
        boost_score=120,
        remaining_views=5,
        ttl_minutes=240,
    )
    return 1 if boost else 0


def trigger_activity_injection(user):
    # Keep this cheap and deterministic. New users get launch injection, others get recovery only if needed.
    now = timezone.now()
    if user.date_joined >= now - timedelta(hours=24):
        return inject_new_user_visibility(user, limit=20)
    return inject_underexposed_recovery(user, limit=10)


def admin_boost_visibility(user, limit=20):
    active_users = get_active_users(limit=limit, exclude_ids=[user.id])
    created = 0
    for viewer in active_users:
        if upsert_visibility_boost(
            viewer=viewer,
            target=user,
            source="admin_boost",
            boost_score=110,
            remaining_views=15,
            ttl_minutes=240,
        ):
            created += 1
    return created


def admin_reduce_visibility(user, limit=30):
    active_users = get_active_users(limit=limit, exclude_ids=[user.id])
    created = 0
    for viewer in active_users:
        if upsert_visibility_boost(
            viewer=viewer,
            target=user,
            source="admin_reduce",
            boost_score=-90,
            remaining_views=20,
            ttl_minutes=180,
        ):
            created += 1
    return created


def admin_force_inject(user, limit=20):
    active_users = get_active_users(limit=limit, exclude_ids=[user.id])
    created = 0
    for target in active_users:
        if upsert_visibility_boost(
            viewer=target,
            target=user,
            source="admin_force_inject",
            boost_score=130,
            remaining_views=20,
            ttl_minutes=240,
        ):
            created += 1
        if upsert_visibility_boost(
            viewer=user,
            target=target,
            source="admin_force_inject",
            boost_score=95,
            remaining_views=12,
            ttl_minutes=180,
        ):
            created += 1
    return created

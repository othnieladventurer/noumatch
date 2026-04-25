# services/ranking.py
from datetime import timedelta
from django.utils import timezone
from admin_dashboard.models import ProfileImpression
from users.models import UserEngagementScore




def compute_ranking_score(viewer, profile):
    """
    Returns a float score between 0 and 100.
    Higher score = more likely to be shown early.
    """
    score = 50.0  # base

    # 1. Profile completeness (0-20)
    completeness = 0
    if profile.profile_photo: completeness += 5
    if profile.bio: completeness += 5
    if profile.city: completeness += 3
    if profile.passions: completeness += 3
    if profile.hobbies: completeness += 2
    if profile.career: completeness += 2
    score += completeness

    # 2. Recent activity (0-22)
    if getattr(profile, "is_online", False):
        score += 12
    if profile.last_activity and profile.last_activity > timezone.now() - timedelta(hours=24):
        score += 10
    elif profile.last_activity and profile.last_activity > timezone.now() - timedelta(days=7):
        score += 5

    # 3. Mutual interest probability (based on shared interests)
    mutual = 0
    if viewer.passions and profile.passions:
        shared = len(set(viewer.passions.split(',')) & set(profile.passions.split(',')))
        mutual += min(shared * 2, 10)
    if viewer.hobbies and profile.hobbies:
        shared = len(set(viewer.hobbies.split(',')) & set(profile.hobbies.split(',')))
        mutual += min(shared * 2, 10)
    score += mutual

    # 4. Avoid recent negative interactions (penalty)
    recent_passes = ProfileImpression.objects.filter(
        viewer=viewer, viewed=profile, swipe_action='pass',
        timestamp__gt=timezone.now() - timedelta(days=7)
    ).count()
    score -= min(recent_passes * 5, 20)

    # 5. Momentum boosts: new users and under-exposed users should be surfaced quickly.
    now = timezone.now()
    if profile.date_joined > now - timedelta(hours=24):
        score += 22
    elif profile.date_joined > now - timedelta(days=3):
        score += 12

    # Reciprocal launch boost: when a user is new, prioritize active profiles to increase first outcomes.
    if viewer.date_joined > now - timedelta(hours=24):
        if profile.last_activity and profile.last_activity > now - timedelta(hours=48):
            score += 10

    # Exposure balancing: boost profiles that have not been seen much recently.
    recent_impressions = ProfileImpression.objects.filter(
        viewed=profile,
        timestamp__gt=now - timedelta(hours=24),
    ).count()
    if recent_impressions < 10:
        score += 15
    elif recent_impressions < 30:
        score += 8

    # 6. Behavior score boost (active + healthy users shown more)
    scorecard = getattr(profile, "engagement_scorecard", None)
    if scorecard is None:
        scorecard = UserEngagementScore.objects.filter(user=profile).only("overall_score", "trust_score").first()
    if scorecard:
        score += min(10, (scorecard.overall_score / 100) * 10)
        if scorecard.trust_score < 40:
            score -= 10

    return max(0, min(100, score))




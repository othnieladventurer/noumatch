# services/ranking.py
from django.db.models import Q, Count, FloatField
from django.db.models.functions import Coalesce
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

    # 2. Recent activity (0-15)
    if profile.last_activity and profile.last_activity > timezone.now() - timedelta(hours=24):
        score += 15
    elif profile.last_activity and profile.last_activity > timezone.now() - timedelta(days=7):
        score += 8

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

    # 5. Boost fresh profiles (registered in last 3 days)
    if profile.date_joined > timezone.now() - timedelta(days=3):
        score += 10

    # 6. Behavior score boost (active + healthy users shown more)
    scorecard = getattr(profile, "engagement_scorecard", None)
    if scorecard is None:
        scorecard = UserEngagementScore.objects.filter(user=profile).only("overall_score", "trust_score").first()
    if scorecard:
        score += min(10, (scorecard.overall_score / 100) * 10)
        if scorecard.trust_score < 40:
            score -= 10

    return max(0, min(100, score))




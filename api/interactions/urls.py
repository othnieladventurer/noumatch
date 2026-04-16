from django.urls import path
from .views import (
    LikeCreateView, ReceivedLikesView, SentLikesView, UnlikeByLikeIdView, UnlikeView,
    CreatePassView, CheckPassView, RemovePassView, UserPassesSentView, UserPassesReceivedView,
    PassStatsView, BulkCreatePassView, GetSwipeLimitsView, IncrementLikeView, IncrementPassView
)

urlpatterns = [
    path('like/', LikeCreateView.as_view(), name='like-create'),
    path('likes/received/', ReceivedLikesView.as_view(), name='likes-received'),
    path('likes/sent/', SentLikesView.as_view(), name='likes-sent'),
    path('unlike/<int:user_id>/', UnlikeView.as_view(), name='unlike-user'),
    path('unlike/like/<int:like_id>/', UnlikeByLikeIdView.as_view(), name='unlike-by-id'),

    # Pass URLs
    path('pass/', CreatePassView.as_view(), name='create-pass'),
    path('pass/bulk/', BulkCreatePassView.as_view(), name='bulk-create-pass'),
    path('pass/<int:user_id>/', CheckPassView.as_view(), name='check-pass'),
    path('pass/<int:user_id>/remove/', RemovePassView.as_view(), name='remove-pass'),
    path('passes/sent/', UserPassesSentView.as_view(), name='passes-sent'),
    path('passes/received/', UserPassesReceivedView.as_view(), name='passes-received'),
    path('passes/stats/', PassStatsView.as_view(), name='pass-stats'),

    # Swipe tracking endpoints
    path('swipe/limits/', GetSwipeLimitsView.as_view(), name='swipe-limits'),
    path('swipe/like/', IncrementLikeView.as_view(), name='swipe-like'),
    path('swipe/pass/', IncrementPassView.as_view(), name='swipe-pass'),
]
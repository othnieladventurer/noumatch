from django.urls import path
from .views import MatchCreateView, MatchesListView, MatchCheckView, UnmatchView, UnmatchByUserView





urlpatterns = [
    path('match/create/', MatchCreateView.as_view(), name='match-create'),
    path('matches/', MatchesListView.as_view(), name='matches-list'),
    path('matches/check/<int:user_id>/', MatchCheckView.as_view(), name='match-check'),
    path('unmatch/<int:match_id>/', UnmatchView.as_view(), name='unmatch-by-id'),
    path('unmatch/user/<int:user_id>/', UnmatchByUserView.as_view(), name='unmatch-by-user'),
]




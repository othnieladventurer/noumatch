from django.urls import path
from .views import MatchCreateView, MatchesListView, MatchCheckView





urlpatterns = [
    path('match/create/', MatchCreateView.as_view(), name='match-create'),
    path('matches/', MatchesListView.as_view(), name='matches-list'),
    path('matches/check/<int:user_id>/', MatchCheckView.as_view(), name='match-check'),
]




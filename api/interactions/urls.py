from django.urls import path
from .views import LikeCreateView, ReceivedLikesView, SentLikesView

urlpatterns = [
    path('like/', LikeCreateView.as_view(), name='like-create'),
    path('likes/received/', ReceivedLikesView.as_view(), name='likes-received'),
    path('likes/sent/', SentLikesView.as_view(), name='likes-sent'),
]




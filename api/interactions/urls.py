from django.urls import path
from .views import LikeCreateView, ReceivedLikesView, SentLikesView, UnlikeByLikeIdView, UnlikeView, UnlikeView  

urlpatterns = [
    path('like/', LikeCreateView.as_view(), name='like-create'),
    path('likes/received/', ReceivedLikesView.as_view(), name='likes-received'),
    path('likes/sent/', SentLikesView.as_view(), name='likes-sent'),
    path('unlike/<int:user_id>/', UnlikeView.as_view(), name='unlike-user'),
    path('unlike/like/<int:like_id>/', UnlikeByLikeIdView.as_view(), name='unlike-by-id'),
]




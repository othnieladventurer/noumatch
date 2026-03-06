# blocks/urls.py
from django.urls import path
from . import views






urlpatterns = [
    path('blocks/', views.BlockListCreateView.as_view(), name='block-list-create'),
    path('blocks/<int:user_id>/unblock/', views.UnblockView.as_view(), name='unblock'),
    path('blocks/<int:user_id>/status/', views.CheckBlockStatusView.as_view(), name='check-block-status'),
]




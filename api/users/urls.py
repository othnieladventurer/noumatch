from django.urls import path

from . import views

from .views import (RegisterView, LoginView, 
                    LogoutView, ChangePasswordView,
                    UserListView, MeView, UserProfileListView, UserDetailView, ProfileUpdateView)

urlpatterns = [
    path("all/", UserListView.as_view(), name="user-list"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path('heartbeat/', views.heartbeat, name='heartbeat'),
    path("me/", MeView.as_view(), name="me"),
    path('profiles/', UserProfileListView.as_view(), name='profile-list'),
    path('profiles/<int:pk>/', UserDetailView.as_view(), name='profile-detail'),
    path('profile/update/', ProfileUpdateView.as_view(), name='profile-update'),


    path("logout/", LogoutView.as_view(), name="logout"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
]




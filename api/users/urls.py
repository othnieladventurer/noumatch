from django.urls import path

from . import views

from .views import (RegisterView, LoginView, 
                    LogoutView, ChangePasswordView, ResendOTPView,
                    UserListView, MeView, UserProfileListView, UserDetailView, 
                    ProfileUpdateView, VerifyOTPView, ResendOTPView, check_email,
                    ForgotPasswordView, ResetPasswordConfirmView)

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
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("reset-password/", ResetPasswordConfirmView.as_view(), name="reset_password_confirm"),


   
    path('<int:user_id>/photos/', 
         views.UserPhotoListView.as_view(), 
         name='user-photos-list'),
    
    path('photos/upload/', 
         views.UserPhotoUploadView.as_view(), 
         name='user-photos-upload'),
    
    path('photos/upload-multiple/', 
         views.UserPhotoViewSet.as_view({'post': 'upload_multiple'}), 
         name='user-photos-upload-multiple'),
    
    path('photos/<int:pk>/delete/', 
         views.UserPhotoDeleteView.as_view(), 
         name='user-photos-delete'),
    
    path('photos/delete-all/', 
         views.UserPhotoViewSet.as_view({'delete': 'delete_all_photos'}), 
         name='user-photos-delete-all'),


     path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
     path('resend-otp/', ResendOTPView.as_view(), name='resend_otp'),
     
     path('check-email/', check_email, name='check_email'),

]




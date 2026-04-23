import logging
import threading
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action, throttle_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAdminUser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination

from .models import User, UserPhoto, OTP
from interactions.models import Like, Pass
from matches.models import Match
from block.models import Block
from .serializers import (
    RegisterSerializer, LoginSerializer, 
    ChangePasswordSerializer, UserSerializer, MeSerializer, 
    UserProfileSerializer, UserPhotoSerializer, ForgotPasswordSerializer,
    ResetPasswordConfirmSerializer, validate_uploaded_image
)
from .utils import generate_otp, send_otp_email
from .email_api import send_otp_via_api, send_password_reset_email
from .auth_cookies import (
    set_auth_cookies,
    clear_auth_cookies,
    get_refresh_token_from_request,
)
from .throttles import (
    AuthLoginThrottle,
    AuthRegisterThrottle,
    OTPVerifyThrottle,
    OTPResendThrottle,
    PasswordResetThrottle,
    EmailCheckThrottle,
    HeartbeatThrottle,
    PhotoUploadThrottle,
)

from admin_dashboard.services.ranking import compute_ranking_score
from datetime import timedelta








class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]



class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [AuthRegisterThrottle]

    def create(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip().lower()

        # FIRST CHECK: Is this email already registered?
        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "Votre email est déjà enregistré. Retournez sur connexion."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # SECOND CHECK: Is this email in the waitlist and contacted?
        from waitlist.models import WaitlistEntry, ContactedArchive
        
        # Check in active waitlist first
        waitlist_entry = WaitlistEntry.objects.filter(email=email, contacted=True).first()
        
        # If not found in active waitlist, check in contacted archive
        if not waitlist_entry:
            archived_entry = ContactedArchive.objects.filter(email=email).first()
            if archived_entry:
                # They were contacted and archived - allowed to register
                pass
            else:
                return Response(
                    {"error": "Accès non autorisé. Vous devez d'abord rejoindre la liste d'attente et être contacté par notre équipe pour vous inscrire."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # If found in waitlist but not contacted
        if waitlist_entry and not waitlist_entry.contacted:
            return Response(
                {"error": "Votre inscription sur la liste d'attente est en cours de traitement. Vous recevrez un email de confirmation avant de pouvoir créer votre compte."},
                status=status.HTTP_403_FORBIDDEN
            )

        # User is authorized to register
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Mark waitlist entry as used (optional - to prevent re-registration)
        if waitlist_entry:
            # Optionally move to archive or mark as registered
            pass

        # Generate 4-digit OTP
        otp_code = generate_otp()
        
        # Delete any existing OTP and create new one
        OTP.objects.filter(user=user).delete()
        OTP.objects.create(
            user=user,
            code=otp_code,
            is_used=False,
            attempts=0
        )
        
        def send_email_background():
            try:
                send_otp_via_api(user, otp_code)
            except Exception as e:
                logging.info(f"Background email failed: {e}")
        
        thread = threading.Thread(target=send_email_background)
        thread.daemon = True
        thread.start()
        
        logging.info("Registration successful for user_id=%s", user.id)
        

        return Response({
            "message": "Registration successful. Please verify your email with the 4-digit code sent.",
            "user_id": user.id,
        }, status=status.HTTP_201_CREATED)







class CheckCanRegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [EmailCheckThrottle]
    
    def get(self, request):
        email = request.query_params.get('email', '').strip().lower()
        
        if not email:
            return Response({"can_register": False, "message": "Email requis"}, status=400)
        
        from waitlist.models import WaitlistEntry, ContactedArchive
        
        # Check if already registered
        if User.objects.filter(email=email).exists():
            return Response({
                "can_register": False, 
                "message": "Cet email est déjà utilisé. Connectez-vous."
            })
        
        # Check if in waitlist and contacted
        waitlist_entry = WaitlistEntry.objects.filter(email=email, contacted=True).first()
        
        if waitlist_entry:
            return Response({
                "can_register": True,
                "message": "Vous pouvez créer votre compte"
            })
        
        # Check archive
        archived_entry = ContactedArchive.objects.filter(email=email).first()
        
        if archived_entry:
            return Response({
                "can_register": True,
                "message": "Vous pouvez créer votre compte"
            })
        
        return Response({
            "can_register": False,
            "message": "Vous devez rejoindre la liste d'attente et être contacté par notre équipe avant de pouvoir vous inscrire."
        })




        



class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [OTPVerifyThrottle]

    def post(self, request):
        user_id = request.data.get('user_id')
        code = request.data.get('code')

        # Validate input
        if not user_id or not code:
            return Response(
                {'error': 'user_id and code are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate code format (must be 4 digits)
        if not str(code).isdigit() or len(str(code)) != 4:
            return Response(
                {'error': 'Code must be exactly 4 digits'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
            otp = OTP.objects.get(user=user)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid user'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except OTP.DoesNotExist:
            return Response(
                {'error': 'No OTP found. Please request a new code.'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user can attempt (max 5 attempts)
        if not otp.can_attempt():
            remaining_attempts = otp.max_attempts - otp.attempts
            return Response(
                {'error': f'Maximum attempts exceeded ({otp.max_attempts}/5). Please request a new code.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if OTP is valid (not expired and not used)
        if not otp.is_valid():
            if otp.is_used:
                return Response(
                    {'error': 'This code has already been used. Please request a new code.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {'error': 'Code has expired (5 minutes). Please request a new code.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Increment attempts
        otp.increment_attempts()
        
        # Verify code
        if otp.code != code:
            remaining = otp.max_attempts - otp.attempts
            return Response(
                {'error': f'Invalid code. {remaining} attempt(s) remaining.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark OTP as used and verify user
        otp.is_used = True
        otp.save()
        user.is_verified = True
        user.save()

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        response = Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }, status=status.HTTP_200_OK)
        set_auth_cookies(response, str(refresh.access_token), str(refresh), admin=False)
        return response


class ResendOTPView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [OTPResendThrottle]

    def post(self, request):
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid user'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is already verified
        if user.is_verified:
            return Response(
                {'error': 'User is already verified'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate new 4-digit OTP
        otp_code = generate_otp()
        
        # Delete old OTP and create new one (invalidates any previous OTP)
        OTP.objects.filter(user=user).delete()
        OTP.objects.create(
            user=user,
            code=otp_code,
            is_used=False,
            attempts=0
        )
        
        # Send email in background
        def send_email_background():
            try:
                send_otp_via_api(user, otp_code)
            except Exception as e:
                logging.info(f"Resend email failed: {e}")
        
        thread = threading.Thread(target=send_email_background)
        thread.daemon = True
        thread.start()
        
        logging.info("OTP resent for user_id=%s", user.id)

        return Response(
            {'message': 'New 4-digit verification code sent to your email. Valid for 5 minutes.'}, 
            status=status.HTTP_200_OK
        )


class CheckOTPStatusView(APIView):
    """Check if user has a valid OTP (for frontend timer sync)"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            otp = OTP.objects.get(user=user)
        except (User.DoesNotExist, OTP.DoesNotExist):
            return Response({
                'has_valid_otp': False,
                'message': 'No OTP found'
            }, status=status.HTTP_200_OK)
        
        if otp.is_valid():
            # Calculate remaining time (5 minutes = 300 seconds)
            elapsed = (timezone.now() - otp.created_at).total_seconds()
            remaining = max(0, 300 - elapsed)
            
            return Response({
                'has_valid_otp': True,
                'remaining_seconds': int(remaining),
                'attempts_used': otp.attempts,
                'attempts_remaining': otp.max_attempts - otp.attempts
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'has_valid_otp': False,
                'message': 'OTP expired or used'
            }, status=status.HTTP_200_OK)


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny] 
    throttle_classes = [AuthLoginThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = authenticate(request, email=email, password=password)

        if user is None:
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        
        # Check if user is verified
        if not user.is_verified:
            return Response(
                {"detail": "Please verify your email before logging in."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        user.update_last_activity()

        refresh = RefreshToken.for_user(user)

        response = Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })
        set_auth_cookies(response, str(refresh.access_token), str(refresh), admin=False)
        return response
 

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response(status=status.HTTP_205_RESET_CONTENT)
        clear_auth_cookies(response, admin=False)
        clear_auth_cookies(response, admin=True)
        try:
            refresh_token = get_refresh_token_from_request(request, admin=False)
            if not refresh_token:
                return response
            token = RefreshToken(refresh_token)
            token.blacklist()
            return response
        except Exception:
            return response


class TokenRefreshCookieView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = get_refresh_token_from_request(request, admin=False)
        if not refresh_token:
            response = Response({"detail": "Refresh token not provided."}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(response, admin=False)
            return response

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            response = Response({"detail": "Invalid refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(response, admin=False)
            return response

        new_access = serializer.validated_data.get("access")
        rotated_refresh = serializer.validated_data.get("refresh")
        response = Response(
            {
                "access": new_access,
                "refresh": rotated_refresh or refresh_token,
            },
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(response, new_access, rotated_refresh or refresh_token, admin=False)
        return response


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"old_password": "Wrong password"}, status=400)

        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response({"detail": "Password updated successfully"})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        user = User.objects.filter(email=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_token = f"{uid}.{token}"

            frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
            reset_url = f"{frontend_base}/reset-password/{reset_token}"

            thread = threading.Thread(
                target=send_password_reset_email,
                args=(user, reset_url),
                daemon=True,
            )
            thread.start()

        return Response(
            {
                "detail": (
                    "If this email exists, a password reset link has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw_token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        if "." not in raw_token:
            return Response(
                {"detail": "Invalid reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uidb64, token = raw_token.split(".", 1)
        try:
            user_id = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=user_id, is_active=True)
        except Exception:
            return Response(
                {"detail": "Invalid reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "This reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {"detail": "Password reset successful."},
            status=status.HTTP_200_OK,
        )


class ProfilePagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100





class UserProfileListView(generics.ListAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ProfilePagination  

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()
        
        
        queryset = User.objects.none()
        
        try:
            if user.gender == 'male':
                queryset = User.objects.filter(is_active=True, gender='female')
            elif user.gender == 'female':
                queryset = User.objects.filter(is_active=True, gender='male')
            else:
                queryset = User.objects.filter(is_active=True)
            
            queryset = queryset.filter(is_superuser=False)
            
            liked_ids = Like.objects.filter(from_user=user).values_list('to_user_id', flat=True)
            matches_as_user1 = Match.objects.filter(user1=user).values_list('user2_id', flat=True)
            matches_as_user2 = Match.objects.filter(user2=user).values_list('user1_id', flat=True)
            matched_ids = list(matches_as_user1) + list(matches_as_user2)
            blocked_ids = Block.objects.filter(blocker=user).values_list('blocked_id', flat=True)
            active_pass_ids = Pass.objects.filter(from_user=user, expires_at__gt=now).values_list('to_user_id', flat=True)
            
            base_exclusions = set(liked_ids) | set(matched_ids) | set(blocked_ids) | set(active_pass_ids)
            base_exclusions.add(user.id)
            
            queryset = queryset.exclude(id__in=base_exclusions).select_related('engagement_scorecard')
            
        except Exception:
            logging.exception("Error building profile queryset")
            queryset = User.objects.none()
        
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        debug = request.GET.get('debug') == 'true'
        
        # Build list with ranking scores
        profile_list = []
        for profile in queryset:
            score = compute_ranking_score(request.user, profile)
            reasons = []
            if debug:
                reasons = self._get_ranking_reasons(request.user, profile)
            
            # Get serializer data
            serializer = self.get_serializer(profile)
            profile_data = serializer.data
            profile_data['ranking_score'] = score
            if debug:
                profile_data['ranking_reasons'] = reasons
            profile_list.append(profile_data)
        
        # Sort by ranking score descending (highest first)
        profile_list.sort(key=lambda x: x['ranking_score'], reverse=True)
        
        # Apply pagination
        page = self.paginate_queryset(profile_list)
        
        if page is not None:
            response_data = {
                "profiles": page,
                "user_account_type": request.user.account_type,
                "can_see_who_liked": request.user.account_type != 'free'
            }
            paginated_response = self.get_paginated_response(response_data)
            return paginated_response
        
        response_data = {
            "profiles": profile_list,
            "user_account_type": request.user.account_type,
            "can_see_who_liked": request.user.account_type != 'free'
        }
        return Response(response_data)
    
    def _get_ranking_reasons(self, viewer, profile):
        reasons = []
        if profile.profile_photo:
            reasons.append("Has profile photo (+5)")
        if profile.bio:
            reasons.append("Has bio (+5)")
        if profile.city:
            reasons.append("Location filled (+3)")
        if profile.passions:
            reasons.append("Has passions (+3)")
        if profile.hobbies:
            reasons.append("Has hobbies (+2)")
        if profile.last_activity and profile.last_activity > timezone.now() - timedelta(hours=24):
            reasons.append("Active in last 24h (+15)")
        elif profile.last_activity and profile.last_activity > timezone.now() - timedelta(days=7):
            reasons.append("Active in last 7 days (+8)")
        if profile.date_joined > timezone.now() - timedelta(days=3):
            reasons.append("New user boost (+10)")
        return reasons
   













class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProfileUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def put(self, request, *args, **kwargs):
                return self.partial_update(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            logging.info("Profile update validation error for user_id=%s", request.user.id)
            raise e
            
        self.perform_update(serializer)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([HeartbeatThrottle])
def heartbeat(request):
    user = request.user
    user.update_last_activity()
    return Response({
        "status": "ok",
        "user_id": user.id,
        "timestamp": timezone.now(),
        "unread_notifications": user.notifications.filter(is_read=False).count()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([EmailCheckThrottle])
def check_email(request):
    email = request.GET.get('email', '').strip()
    if not email:
        return Response({'exists': False, 'error': 'No email'}, status=400)
    exists = User.objects.filter(email=email).exists()
    return Response({'exists': exists})


class UserPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = UserPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [PhotoUploadThrottle]

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        if user_id:
            return UserPhoto.objects.filter(user_id=user_id)
        else:
            return UserPhoto.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='upload-multiple')
    def upload_multiple(self, request):
        files = request.FILES.getlist('images')
        
        if not files:
            return Response(
                {"error": "No images provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        current_photo_count = request.user.photos.count()
        if current_photo_count + len(files) > 10:
            return Response(
                {"error": f"Cannot upload {len(files)} photos. You can only add {10 - current_photo_count} more photo(s)."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_photos = []
        errors = []
        
        for file in files:
            try:
                validate_uploaded_image(file)
                photo = UserPhoto.objects.create(
                    user=request.user,
                    image=file
                )
                serializer = self.get_serializer(photo)
                created_photos.append(serializer.data)
            except Exception as e:
                errors.append({file.name: str(e)})
        
        response_data = {
            "uploaded": created_photos,
            "count": len(created_photos)
        }
        
        if errors:
            response_data["errors"] = errors
            return Response(response_data, status=status.HTTP_207_MULTI_STATUS)
        
        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='delete')
    def delete_photo(self, request, pk=None):
        photo = self.get_object()
        
        if photo.user != request.user:
            return Response(
                {"error": "You don't have permission to delete this photo"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        photo.delete()
        return Response(
            {"message": "Photo deleted successfully"},
            status=status.HTTP_204_NO_CONTENT
        )

    @action(detail=False, methods=['delete'], url_path='delete-all')
    def delete_all_photos(self, request):
        count = request.user.photos.count()
        request.user.photos.all().delete()
        return Response(
            {"message": f"Successfully deleted {count} photo(s)"},
            status=status.HTTP_204_NO_CONTENT
        )


class UserPhotoListView(generics.ListAPIView):
    serializer_class = UserPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return UserPhoto.objects.filter(user_id=user_id)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class UserPhotoUploadView(generics.CreateAPIView):
    serializer_class = UserPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [PhotoUploadThrottle]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserPhotoDeleteView(generics.DestroyAPIView):
    serializer_class = UserPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserPhoto.objects.filter(user=self.request.user)






class UserStatsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            stats = user.stats  # OneToOne relation
            return Response({
                'likes_given': stats.total_likes_given,
                'likes_received': stats.total_likes_received,
                'matches': stats.total_matches,
                'active_matches': stats.active_matches,
                'messages_sent': stats.total_messages_sent,
                'messages_received': stats.total_messages_received,
                'blocks_given': stats.total_blocks_given,
                'blocks_received': stats.total_blocks_received,
                'reports_filed': stats.total_reports_filed,
                'reports_received': stats.total_reports_received,
                'last_active': stats.last_active,
                'account_age_days': stats.account_age_days,
                'streak_days': stats.streak_days,
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)







        


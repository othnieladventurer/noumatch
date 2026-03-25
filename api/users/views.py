import threading
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAdminUser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .models import User, UserPhoto
from interactions.models import Like, Pass
from matches.models import Match
from block.models import Block
from .serializers import (RegisterSerializer, LoginSerializer, 
                          ChangePasswordSerializer, UserSerializer, MeSerializer, UserProfileSerializer,
                          UserPhotoSerializer)

from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils import timezone
from .models import OTP
from .utils import generate_otp, send_otp_email
from rest_framework import status
from .email_api import send_otp_via_api


class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]







class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # Pass the request to serializer context
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate OTP
        otp_code = generate_otp()
        
        # Save OTP to database
        OTP.objects.update_or_create(
            user=user,
            defaults={'code': otp_code, 'is_used': False}
        )
        
        # Send email in background thread
        def send_email_background():
            try:
                send_otp_via_api(user, otp_code)
            except Exception as e:
                print(f"Background email failed: {e}")
        
        # Start background thread
        thread = threading.Thread(target=send_email_background)
        thread.daemon = True
        thread.start()
        
        # Log for debugging
        print(f"🔐 Registration: {user.email} | OTP: {otp_code}")
        print(f"📍 Location: {user.city}, {user.country} | Coordinates: {user.latitude}, {user.longitude}")

        # Return immediately
        return Response({
            "message": "Registration successful. Please verify your email.",
            "user_id": user.id,
        }, status=status.HTTP_201_CREATED)







class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        code = request.data.get('code')

        if not user_id or not code:
            return Response({'error': 'user_id and code are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
            otp = OTP.objects.get(user=user)
        except User.DoesNotExist:
            return Response({'error': 'Invalid user'}, status=status.HTTP_404_NOT_FOUND)
        except OTP.DoesNotExist:
            return Response({'error': 'OTP not found'}, status=status.HTTP_404_NOT_FOUND)

        if not otp.is_valid():
            return Response({'error': 'OTP is invalid or expired'}, status=status.HTTP_400_BAD_REQUEST)

        if otp.code != code:
            return Response({'error': 'Invalid code'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark OTP as used and verify user
        otp.is_used = True
        otp.save()
        user.is_verified = True
        user.save()

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
            }
        }, status=status.HTTP_200_OK)



class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Invalid user'}, status=status.HTTP_404_NOT_FOUND)

        # Generate new OTP
        otp_code = generate_otp()
        
        # Update OTP in database - reset attempts and timer
        OTP.objects.update_or_create(
            user=user,
            defaults={
                'code': otp_code, 
                'is_used': False, 
                'attempts': 0,
                'created_at': timezone.now()  # Reset creation time
            }
        )
        
        # Send email in background
        def send_email_background():
            try:
                send_otp_via_api(user, otp_code)
            except Exception as e:
                print(f"Resend email failed: {e}")
        
        thread = threading.Thread(target=send_email_background)
        thread.daemon = True
        thread.start()

        return Response(
            {'message': 'New verification code sent to your email'}, 
            status=status.HTTP_200_OK
        )
    



class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny] 

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

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        user.update_last_activity()

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })
    

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


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


class UserProfileListView(generics.ListAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()
        
        print(f"🔍 CURRENT USER: ID={user.id}, Username={user.username}")
        print(f"🔍 USER GENDER: {user.gender}")
        
        queryset = User.objects.none()
        
        try:
            if user.gender == 'male':
                queryset = User.objects.filter(
                    is_active=True,
                    gender='female'
                )
                print(f"🔍 Man looking for women")
                
            elif user.gender == 'female':
                queryset = User.objects.filter(
                    is_active=True,
                    gender='male'
                )
                print(f"🔍 Woman looking for men")
                
            else:
                queryset = User.objects.filter(
                    is_active=True
                )
                print(f"🔍 Showing all users")
            
            queryset = queryset.filter(is_superuser=False)
            
            liked_ids = Like.objects.filter(from_user=user).values_list('to_user_id', flat=True)
            matches_as_user1 = Match.objects.filter(user1=user).values_list('user2_id', flat=True)
            matches_as_user2 = Match.objects.filter(user2=user).values_list('user1_id', flat=True)
            matched_ids = list(matches_as_user1) + list(matches_as_user2)
            blocked_ids = Block.objects.filter(blocker=user).values_list('blocked_id', flat=True)
            active_pass_ids = Pass.objects.filter(
                from_user=user,
                expires_at__gt=now
            ).values_list('to_user_id', flat=True)
            
            all_exclusions = set(liked_ids) | set(matched_ids) | set(blocked_ids) | set(active_pass_ids)
            all_exclusions.add(user.id)
            
            queryset = queryset.exclude(id__in=all_exclusions)
            queryset = queryset.exclude(id=user.id)
            
            print(f"🔍 FINAL RESULTS: {queryset.count()} profiles")
            for profile in queryset[:5]:
                print(f"  ✅ Profile ID: {profile.id}, Username: {profile.username}, Gender: {profile.gender}")
            
        except Exception as e:
            print(f"❌ ERROR in get_queryset: {e}")
            queryset = User.objects.none()
        
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # 🔍 DEBUG - Print the first profile's photo URL
        if serializer.data:
            print("🔍 DEBUG - First profile data:")
            print(f"   profile_photo: {serializer.data[0].get('profile_photo')}")
            print(f"   profile_photo_url: {serializer.data[0].get('profile_photo_url')}")
        
        print(f"🔍 RETURNING {len(serializer.data)} profiles to frontend")
        return Response(serializer.data)


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
        print("🔍 Request data:", request.data)
        print("🔍 Request FILES:", request.FILES)
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
            print("❌ Validation errors:", serializer.errors)
            raise e
            
        self.perform_update(serializer)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def heartbeat(request):
    user = request.user
    user.update_last_activity()
    return Response({
        "status": "ok",
        "user_id": user.id,
        "timestamp": timezone.now(),
        "unread_notifications": user.notifications.filter(is_read=False).count()
    }, status=status.HTTP_200_OK)


class UserPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = UserPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

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
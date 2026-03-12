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






class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]




class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]   # 👈 ADD THIS

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            "user": {
                "email": user.email,
                "username": user.username,
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=201)    


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

        # Update last_login timestamp
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Also update last_activity if you want to track online status
        user.update_last_activity()

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })
    


class MeView(APIView):
    permission_classes = [IsAuthenticated]  # ✅ only authenticated users

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





# Add this new view for profile discovery
class UserProfileListView(generics.ListAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()
        
        print(f"🔍 CURRENT USER: ID={user.id}, Username={user.username}")
        print(f"🔍 INTERESTED IN: {user.interested_in}")
        
        # START WITH ABSOLUTELY NOTHING
        queryset = User.objects.none()
        
        try:
            # Get gender filter from query params
            gender = self.request.query_params.get('gender', None)
            
            # Build base query based on user's interests
            if user.interested_in == 'male':
                # User wants to see males
                queryset = User.objects.filter(
                    is_active=True,
                    gender='male'
                )
                print(f"🔍 Filtering for male users")
                
            elif user.interested_in == 'female':
                # User wants to see females
                queryset = User.objects.filter(
                    is_active=True,
                    gender='female'
                )
                print(f"🔍 Filtering for female users")
                
            elif user.interested_in == 'everyone':
                # User wants to see everyone
                queryset = User.objects.filter(
                    is_active=True
                )
                print(f"🔍 Filtering for all users")
            
            # 👇 EXCLUDE ALL SUPERUSERS (ADMINS)
            queryset = queryset.filter(is_superuser=False)
            
            # ALSO apply gender filter from query param if provided (double filter)
            if gender and gender in ['male', 'female']:
                queryset = queryset.filter(gender=gender)
                print(f"🔍 Additional gender filter: {gender}")
            
            # ===== PERMANENT EXCLUSIONS =====
            
            # 1. Users they've liked (permanent)
            liked_ids = Like.objects.filter(from_user=user).values_list('to_user_id', flat=True)
            print(f"🔍 Excluding {len(liked_ids)} liked users")
            
            # 2. Users they've matched with (permanent)
            matches_as_user1 = Match.objects.filter(user1=user).values_list('user2_id', flat=True)
            matches_as_user2 = Match.objects.filter(user2=user).values_list('user1_id', flat=True)
            matched_ids = list(matches_as_user1) + list(matches_as_user2)
            print(f"🔍 Excluding {len(matched_ids)} matched users")
            
            # 3. Users they've blocked (permanent)
            blocked_ids = Block.objects.filter(blocker=user).values_list('blocked_id', flat=True)
            print(f"🔍 Excluding {len(blocked_ids)} blocked users")
            
            # Combine all permanent exclusions
            permanent_exclusions = set(liked_ids) | set(matched_ids) | set(blocked_ids)
            
            # ===== TEMPORARY EXCLUSIONS =====
            
            # 4. Users they've passed on that haven't expired yet (72 hours)
            active_pass_ids = Pass.objects.filter(
                from_user=user,
                expires_at__gt=now  # Only passes that haven't expired
            ).values_list('to_user_id', flat=True)
            print(f"🔍 Temporarily excluding {len(active_pass_ids)} passed users (active for 72h)")
            
            # Combine ALL exclusions
            all_exclusions = permanent_exclusions | set(active_pass_ids)
            all_exclusions.add(user.id)  # Always exclude self
            
            # Apply all exclusions
            queryset = queryset.exclude(id__in=all_exclusions)
            
            # FINAL SAFETY: NEVER include the current user (redundant but safe)
            queryset = queryset.exclude(id=user.id)
            
            # Log the results
            print(f"🔍 FINAL RESULTS: {queryset.count()} profiles")
            for profile in queryset[:5]:  # Log first 5 only
                print(f"  ✅ Profile ID: {profile.id}, Username: {profile.username}, Gender: {profile.gender}")
            
        except Exception as e:
            print(f"❌ ERROR in get_queryset: {e}")
            queryset = User.objects.none()
        
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Return as a simple array
        print(f"🔍 RETURNING {len(serializer.data)} profiles to frontend")
        return Response(serializer.data)

        

        


# Optional: Add view for single profile details
class UserDetailView(generics.RetrieveAPIView):
    """
    API endpoint to get a specific user's profile by ID
    GET /api/users/profiles/<int:pk>/
    """
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]






class ProfileUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def put(self, request, *args, **kwargs):
        # Log the request data for debugging
        print("🔍 Request data:", request.data)
        print("🔍 Request FILES:", request.FILES)
        
        # Try to parse as partial update first
        return self.partial_update(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)  # Set partial to True by default
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
    """Update user's last activity timestamp"""
    request.user.update_last_activity()
    return Response({"status": "ok"}, status=status.HTTP_200_OK)












class UserPhotoViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing user photos.
    Provides list, create, retrieve, update, delete actions.
    """
    serializer_class = UserPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """Filter photos based on URL parameters or current user"""
        user_id = self.kwargs.get('user_id')
        
        if user_id:
            # Viewing photos of a specific user (for profile viewing)
            return UserPhoto.objects.filter(user_id=user_id)
        else:
            # Viewing own photos (for management)
            return UserPhoto.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        """Add request to serializer context for absolute URLs"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        """Set the user to current user when creating a photo"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='upload-multiple')
    def upload_multiple(self, request):
        """
        Upload multiple photos at once.
        Expects 'images' as a list of files in the request.
        """
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
        """Delete a specific photo"""
        photo = self.get_object()
        
        # Check if user owns this photo
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
        """Delete all photos of the current user"""
        count = request.user.photos.count()
        request.user.photos.all().delete()
        return Response(
            {"message": f"Successfully deleted {count} photo(s)"},
            status=status.HTTP_204_NO_CONTENT
        )

class UserPhotoListView(generics.ListAPIView):
    """
    List all photos of a specific user (public view)
    """
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
    """
    Upload a single photo for the current user
    """
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
    """
    Delete a specific photo (only if owned by current user)
    """
    serializer_class = UserPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserPhoto.objects.filter(user=self.request.user)




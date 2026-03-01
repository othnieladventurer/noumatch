from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import generics, permissions, status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAdminUser

from .models import User
from .serializers import (RegisterSerializer, LoginSerializer, 
                          ChangePasswordSerializer, UserSerializer, MeSerializer, UserProfileSerializer)

from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication






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
    """
    API endpoint to get profiles for discovery based on user's interests
    GET /api/users/profiles/?gender=female
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        print(f"🔍 CURRENT USER: ID={user.id}, Username={user.username}")
        print(f"🔍 INTERESTED IN: {user.interested_in}")
        
        # START WITH ABSOLUTELY NOTHING
        queryset = User.objects.none()
        
        try:
            # Get gender filter from query params
            gender = self.request.query_params.get('gender', None)
            
            # Build query based on user's interests
            if user.interested_in == 'male':
                # User wants to see males
                queryset = User.objects.filter(
                    is_active=True,
                    gender='male'
                ).exclude(id=user.id)
                print(f"🔍 Filtering for male users")
                
            elif user.interested_in == 'female':
                # User wants to see females
                queryset = User.objects.filter(
                    is_active=True,
                    gender='female'
                ).exclude(id=user.id)
                print(f"🔍 Filtering for female users")
                
            elif user.interested_in == 'everyone':
                # User wants to see everyone
                queryset = User.objects.filter(
                    is_active=True
                ).exclude(id=user.id)
                print(f"🔍 Filtering for all users")
            
            # ALSO apply gender filter from query param if provided (double filter)
            if gender and gender in ['male', 'female']:
                queryset = queryset.filter(gender=gender)
                print(f"🔍 Additional gender filter: {gender}")
            
            # FINAL SAFETY: NEVER include the current user
            queryset = queryset.exclude(id=user.id)
            
            # Log the results
            print(f"🔍 FINAL RESULTS: {queryset.count()} profiles")
            for profile in queryset:
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
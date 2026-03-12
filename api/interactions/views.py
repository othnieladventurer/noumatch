from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, permissions, status
from .models import Pass, Like
from .serializers import LikeSerializer, PassSerializer, PassCheckSerializer, BulkPassSerializer
from django.shortcuts import get_object_or_404

from django.db import models
from django.contrib.auth import get_user_model
from users.models import User




class LikeCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        print(f"🔵 Received like request from user {request.user.id}")
        print(f"📦 Request data: {request.data}")
        
        serializer = LikeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            like = serializer.save()
            print(f"✅ Like created: {like.from_user.id} -> {like.to_user.id}")
            
            # Return the full like object with user details
            response_serializer = LikeSerializer(like, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        print(f"❌ Validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





class ReceivedLikesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            print(f"🔵 Fetching received likes for user {request.user.id}")
            likes = Like.objects.filter(to_user=request.user).select_related('from_user')
            print(f"📊 Found {likes.count()} received likes")
            
            serializer = LikeSerializer(likes, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            print(f"❌ Error fetching received likes: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





class SentLikesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            print(f"🔵 Fetching sent likes for user {request.user.id}")
            likes = Like.objects.filter(from_user=request.user).select_related('to_user')
            print(f"📊 Found {likes.count()} sent likes")
            
            serializer = LikeSerializer(likes, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            print(f"❌ Error fetching sent likes: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class UnlikeView(APIView):
    """
    Delete a like (unlike a user)
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        """
        Delete a like where the authenticated user is the from_user
        and the target user is the user_id
        """
        try:
            print(f"🔵 Unlike request: user {request.user.id} unliking user {user_id}")
            
            # Find the like where current user is the from_user and target is the user_id
            like = get_object_or_404(
                Like, 
                from_user=request.user, 
                to_user_id=user_id
            )
            
            # Store the like data before deleting for response
            like_data = LikeSerializer(like, context={'request': request}).data
            
            # Delete the like
            like.delete()
            print(f"✅ Unlike successful: user {request.user.id} unliked user {user_id}")
            
            return Response(
                {"message": "Like removed successfully", "like": like_data},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            print(f"❌ Unlike failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UnlikeByLikeIdView(APIView):
    """
    Delete a like by its ID
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, like_id):
        """
        Delete a specific like by ID, ensuring the user owns it
        """
        try:
            print(f"🔵 Unlike request: user {request.user.id} deleting like {like_id}")
            
            # Find the like by ID and ensure it belongs to the current user
            like = get_object_or_404(
                Like, 
                id=like_id,
                from_user=request.user
            )
            
            # Store the like data before deleting
            like_data = LikeSerializer(like, context={'request': request}).data
            
            # Delete the like
            like.delete()
            print(f"✅ Unlike successful: like {like_id} deleted")
            
            return Response(
                {"message": "Like removed successfully", "like": like_data},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            print(f"❌ Unlike failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )








class CreatePassView(generics.CreateAPIView):
    """Create a new pass (when user swipes left)"""
    serializer_class = PassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class BulkCreatePassView(APIView):
    """Create multiple passes at once"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BulkPassSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user_ids = serializer.validated_data['user_ids']
        created_passes = []
        errors = []

        for user_id in user_ids:
            try:
                # Check if user exists
                to_user = User.objects.get(id=user_id)
                
                # Check if already passed
                if Pass.objects.filter(from_user=request.user, to_user=to_user).exists():
                    errors.append({f"user_{user_id}": "Already passed on this user"})
                    continue
                
                # Check if already liked
                if Like.objects.filter(from_user=request.user, to_user=to_user).exists():
                    errors.append({f"user_{user_id}": "Cannot pass on liked user"})
                    continue

                # Create pass
                pass_obj = Pass.objects.create(
                    from_user=request.user,
                    to_user=to_user
                )
                created_passes.append(pass_obj)
                
            except User.DoesNotExist:
                errors.append({f"user_{user_id}": "User not found"})

        response_data = {
            "created_count": len(created_passes),
            "created": PassSerializer(created_passes, many=True).data if created_passes else [],
            "errors": errors
        }

        if errors and not created_passes:
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
        elif errors:
            return Response(response_data, status=status.HTTP_207_MULTI_STATUS)
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class CheckPassView(APIView):
    """Check if current user has passed on a specific user"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        try:
            to_user = User.objects.get(id=user_id)
            pass_obj = Pass.objects.filter(
                from_user=request.user,
                to_user=to_user
            ).first()
            
            data = {
                'has_passed': pass_obj is not None,
                'passed_at': pass_obj.created_at if pass_obj else None
            }
            serializer = PassCheckSerializer(data)
            return Response(serializer.data)
            
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class RemovePassView(APIView):
    """Remove a pass (if user changes their mind)"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        try:
            pass_obj = Pass.objects.get(
                from_user=request.user,
                to_user_id=user_id
            )
            pass_obj.delete()
            return Response(
                {"message": "Pass removed successfully"},
                status=status.HTTP_204_NO_CONTENT
            )
        except Pass.DoesNotExist:
            return Response(
                {"error": "Pass not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class UserPassesSentView(generics.ListAPIView):
    """Get all passes sent by current user"""
    serializer_class = PassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Pass.objects.filter(from_user=self.request.user)


class UserPassesReceivedView(generics.ListAPIView):
    """Get all passes received by current user"""
    serializer_class = PassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Pass.objects.filter(to_user=self.request.user)


class PassStatsView(APIView):
    """Get pass statistics for current user"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total_passes_sent = Pass.objects.filter(from_user=request.user).count()
        total_passes_received = Pass.objects.filter(to_user=request.user).count()
        
        # Get recent passes (last 7 days)
        from django.utils import timezone
        from datetime import timedelta
        
        week_ago = timezone.now() - timedelta(days=7)
        recent_passes_sent = Pass.objects.filter(
            from_user=request.user,
            created_at__gte=week_ago
        ).count()

        return Response({
            'total_passes_sent': total_passes_sent,
            'total_passes_received': total_passes_received,
            'recent_passes_sent': recent_passes_sent,
        })







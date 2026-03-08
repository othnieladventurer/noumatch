from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import Like
from .serializers import LikeSerializer
from django.shortcuts import get_object_or_404




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











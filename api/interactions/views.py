from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import Like
from .serializers import LikeSerializer




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
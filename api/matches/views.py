from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Q
from .models import Match
from .serializers import MatchSerializer

class MatchCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user1_id = request.data.get('user1_id')
        user2_id = request.data.get('user2_id')
        
        if not user1_id or not user2_id:
            return Response(
                {"error": "Both user1_id and user2_id are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure current user is one of the participants
        if request.user.id not in [int(user1_id), int(user2_id)]:
            return Response(
                {"error": "You can only create matches involving yourself"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get or create match with consistent ordering
        match, created = Match.objects.get_or_create(
            user1_id=min(int(user1_id), int(user2_id)),
            user2_id=max(int(user1_id), int(user2_id))
        )
        
        serializer = MatchSerializer(match, context={'request': request})
        
        if created:
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.data, status=status.HTTP_200_OK)




class MatchesListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        matches = Match.objects.filter(
            Q(user1=user) | Q(user2=user)
        ).select_related('user1', 'user2').order_by('-created_at')
        
        serializer = MatchSerializer(matches, many=True, context={'request': request})
        return Response(serializer.data)





class MatchCheckView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        user = request.user
        match_exists = Match.objects.filter(
            Q(user1=user, user2_id=user_id) | 
            Q(user1_id=user_id, user2=user)
        ).exists()
        
        return Response({"is_match": match_exists})
    


    
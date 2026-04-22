import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
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
    




class UnmatchView(APIView):
    """
    Delete a match (unmatch with a user)
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, match_id):
        """
        Delete a match by its ID, ensuring the user is part of it
        """
        try:
            logging.info(f"🔵 Unmatch request: user {request.user.id} unmatching match {match_id}")
            
            # Find the match by ID and ensure the current user is part of it
            match = get_object_or_404(
                Match, 
                id=match_id
            )
            
            # Verify the current user is one of the participants
            if request.user not in [match.user1, match.user2]:
                return Response(
                    {"error": "You are not part of this match"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Store match data before deleting for response
            match_data = MatchSerializer(match, context={'request': request}).data
            
            # Delete the match
            match.delete()
            logging.info(f"✅ Unmatch successful: match {match_id} deleted")
            
            return Response(
                {"message": "Match removed successfully", "match": match_data},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logging.info(f"❌ Unmatch failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UnmatchByUserView(APIView):
    """
    Delete a match by the other user's ID
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        """
        Delete a match where the current user is matched with the specified user
        """
        try:
            logging.info(f"🔵 Unmatch request: user {request.user.id} unmatching user {user_id}")
            
            # Find the match where current user is matched with the specified user
            match = get_object_or_404(
                Match,
                Q(user1=request.user, user2_id=user_id) |
                Q(user1_id=user_id, user2=request.user)
            )
            
            # Store match data before deleting
            match_data = MatchSerializer(match, context={'request': request}).data
            
            # Delete the match
            match.delete()
            logging.info(f"✅ Unmatch successful: user {request.user.id} unmatched user {user_id}")
            
            return Response(
                {"message": "Match removed successfully", "match": match_data},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logging.info(f"❌ Unmatch failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )




    

# blocks/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Block
from .serializers import BlockSerializer
from users.models import User





class BlockListCreateView(generics.ListCreateAPIView):
    serializer_class = BlockSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Block.objects.filter(blocker=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(blocker=self.request.user)

class UnblockView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, user_id):
        block = get_object_or_404(
            Block, 
            blocker=request.user, 
            blocked_id=user_id
        )
        block.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CheckBlockStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        is_blocked = Block.objects.filter(
            blocker=request.user, 
            blocked_id=user_id
        ).exists()
        
        is_blocked_by = Block.objects.filter(
            blocker_id=user_id, 
            blocked=request.user
        ).exists()
        
        return Response({
            'is_blocked': is_blocked,
            'is_blocked_by': is_blocked_by
        })
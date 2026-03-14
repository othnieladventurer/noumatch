from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, permissions, status
from .models import Pass, Like, DailySwipe
from .serializers import LikeSerializer, PassSerializer, PassCheckSerializer, BulkPassSerializer, SwipeLimitSerializer, DailySwipeSerializer
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
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, like_id):

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











class GetSwipeLimitsView(APIView):
    """Get current user's swipe limits for today"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get today's like count
        today_likes = DailySwipe.get_today_count(user, 'like')
        
        # Set daily limit based on account type
        if user.account_type == 'free':
            daily_limit = 10
        elif user.account_type == 'premium':
            daily_limit = 100
        else:  # god_mode
            daily_limit = 999999  # Unlimited
        
        # Calculate remaining likes
        likes_remaining = max(0, daily_limit - today_likes)
        
        data = {
            'can_like': today_likes < daily_limit,
            'likes_remaining': likes_remaining,
            'likes_today': today_likes,
            'daily_limit': daily_limit,
        }
        
        serializer = SwipeLimitSerializer(data)
        return Response(serializer.data)


class IncrementLikeView(APIView):
    """Handle like action with swipe counting"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        to_user_id = request.data.get('to_user_id')
        
        if not to_user_id:
            return Response(
                {"error": "to_user_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if trying to like yourself
        if user.id == to_user_id:
            return Response(
                {"error": "You cannot like yourself"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check daily limit
        today_likes = DailySwipe.get_today_count(user, 'like')
        daily_limit = 10 if user.account_type == 'free' else 100
        
        if today_likes >= daily_limit:
            return Response(
                {"error": "Daily like limit reached", "limit": daily_limit},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        try:
            # Check if like already exists
            like, created = Like.objects.get_or_create(
                from_user=user,
                to_user_id=to_user_id
            )
            
            if created:
                print(f"✅ New like created: {user.id} -> {to_user_id}")
                DailySwipe.increment_swipe(user, 'like')
                
                # 👇 ADD THIS: Send like notification to the person being liked
                from notifications.utils import send_like_notification
                send_like_notification(like)
                
                # 🔥 CHECK FOR MUTUAL LIKE AND CREATE MATCH
                reverse_like = Like.objects.filter(
                    from_user_id=to_user_id,
                    to_user=user
                ).first()
                
                if reverse_like:
                    print(f"🎉 MUTUAL LIKE DETECTED! Creating match...")
                    
                    # Create match
                    from matches.models import Match
                    match, created = Match.objects.get_or_create(
                        user1_id=min(user.id, to_user_id),
                        user2_id=max(user.id, to_user_id)
                    )
                    
                    if created:
                        print(f"✅ Match created successfully")
                        # Send match notifications
                        from notifications.utils import send_match_notification
                        send_match_notification(match, user, reverse_like.from_user)
                
                return Response(
                    {"success": True, "message": "Like recorded"},
                    status=status.HTTP_201_CREATED
                )
            else:
                print(f"ℹ️ Like already exists: {user.id} -> {to_user_id}")
                return Response(
                    {"success": True, "message": "Like already exists"},
                    status=status.HTTP_200_OK
                )
            
        except Exception as e:
            print(f"❌ Error in IncrementLikeView: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )



            



class IncrementPassView(APIView):
    """Handle pass action with swipe counting"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        to_user_id = request.data.get('to_user_id')
        
        print(f"\n🔴🔴🔴 PASS DEBUG START 🔴🔴🔴")
        print(f"User ID: {user.id}")
        print(f"To User ID: {to_user_id}")
        print(f"Request data: {request.data}")
        
        if not to_user_id:
            print("❌ ERROR: to_user_id is missing")
            return Response(
                {"error": "to_user_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is trying to pass on themselves
        if user.id == to_user_id:
            print("❌ ERROR: User trying to pass on themselves")
            return Response(
                {"error": "You cannot pass on yourself"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Check if pass already exists
            pass_exists = Pass.objects.filter(from_user=user, to_user_id=to_user_id).exists()
            print(f"Pass already exists: {pass_exists}")
            
            # Check if user has already liked this person
            like_exists = Like.objects.filter(from_user=user, to_user_id=to_user_id).exists()
            print(f"Like already exists: {like_exists}")
            
            if like_exists:
                print("❌ ERROR: User already liked this person")
                return Response(
                    {"error": "You cannot pass on someone you've already liked"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Only create if it doesn't exist
            if not pass_exists:
                print("Creating new pass record...")
                pass_obj = Pass.objects.create(
                    from_user=user,
                    to_user_id=to_user_id
                )
                print(f"✅ Pass created with ID: {pass_obj.id}, expires: {pass_obj.expires_at}")
            else:
                print("Pass already exists, skipping creation")
            
            # ALWAYS increment the daily swipe count
            print("Incrementing daily swipe count...")
            swipe = DailySwipe.increment_swipe(user, 'pass')
            print(f"✅ Daily swipe count now: {swipe.count} for date {swipe.date}")
            
            print("✅ Pass request successful")
            print(f"🔴🔴🔴 PASS DEBUG END 🔴🔴🔴\n")
            
            return Response(
                {"success": True, "message": "Pass recorded"},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            print(f"❌❌❌ EXCEPTION: {str(e)}")
            import traceback
            traceback.print_exc()
            print(f"🔴🔴🔴 PASS DEBUG END (with error) 🔴🔴🔴\n")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )



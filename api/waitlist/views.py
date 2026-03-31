from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from .models import WaitlistEntry, WaitlistStats
from .serializers import WaitlistEntrySerializer
from rest_framework.permissions import IsAdminUser





@api_view(['POST'])
@permission_classes([AllowAny])
def join_waitlist(request):
    stats = WaitlistStats.get_current_stats()
    gender = request.data.get('gender')
    
    # Enforce balance rule for men
    if gender == 'male' and not stats.can_accept_gender('male'):
        return Response({
            'success': False,
            'message': "Accès temporairement limité. Nous avons atteint la limite d'inscriptions pour le moment afin de garantir une communauté équilibrée et des rencontres de qualité. Merci de revenir plus tard."
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Women are never blocked by ratio rule
    if gender == 'female' and not stats.can_accept_gender('female'):
        # This should never happen with current rules, but keeping for safety
        return Response({
            'success': False,
            'message': "Inscriptions temporairement fermées. Revenez bientôt !"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = WaitlistEntrySerializer(data=request.data)
    if serializer.is_valid():
        # Use transaction to prevent race conditions
        with transaction.atomic():
            entry = serializer.save()
            
            # Re-check balance after saving to ensure we didn't exceed limits
            if gender == 'male':
                stats.refresh_from_db()
                if not stats.can_accept_gender('male'):
                    entry.delete()  # Rollback if exceeded
                    return Response({
                        'success': False,
                        'message': "Accès temporairement limité. Nous avons atteint la limite d'inscriptions pour le moment afin de garantir une communauté équilibrée et des rencontres de qualité. Merci de revenir plus tard."
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            entry.position = WaitlistEntry.objects.filter(
                joined_at__lte=entry.joined_at
            ).count()
            entry.save()
            
            stats.update_counts()
        
        try:
            send_mail(
                subject="Bienvenue sur la liste d'attente NouMatch",
                message=f"""
Bonjour {entry.first_name},

Merci de vous être inscrit(e) sur la liste d'attente NouMatch !

Votre position : #{entry.position}

Nous vous contacterons dès que NouMatch sera disponible dans votre région.

À très bientôt,
L'équipe NouMatch
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[entry.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Email error: {e}")

        return Response({
            'success': True,
            'message': 'Inscription réussie !',
            'data': serializer.data,
            'stats': {
                'position': entry.position,
                'total_waiting': stats.total_men_waiting + stats.total_women_waiting
            }
        }, status=status.HTTP_201_CREATED)

    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def waitlist_stats(request):
    try:
        stats = WaitlistStats.get_current_stats()
        
        data = {
            'total_waiting': stats.total_men_waiting + stats.total_women_waiting,
            'women_waiting': stats.total_women_waiting,
            'men_waiting': stats.total_men_waiting,
            'women_accepted': stats.total_women_accepted,
            'men_accepted': stats.total_men_accepted,
            'can_join_as_woman': stats.can_accept_gender('female'),
            'can_join_as_man': stats.can_accept_gender('male'),
            'target_ratio': {
                'women': stats.target_women_percentage,
                'men': stats.target_men_percentage,
            }
        }
        response = Response(data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        response = Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    response["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response["Access-Control-Allow-Credentials"] = "true"
    response["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
    response["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    return response




@api_view(['GET'])
@permission_classes([IsAdminUser])
def waiting_entries(request):
    """Get all waiting entries (not accepted) - Admin only"""
    entries = WaitlistEntry.objects.filter(is_accepted=False).order_by('joined_at')
    serializer = WaitlistEntrySerializer(entries, many=True)
    return Response(serializer.data)



@api_view(['GET'])
@permission_classes([IsAdminUser])
def debug_entries(request):
    """Debug endpoint to see all entries"""
    all_entries = WaitlistEntry.objects.all()
    waiting_entries = WaitlistEntry.objects.filter(is_accepted=False)
    accepted_entries = WaitlistEntry.objects.filter(is_accepted=True)
    
    data = {
        'total_entries': all_entries.count(),
        'waiting_count': waiting_entries.count(),
        'accepted_count': accepted_entries.count(),
        'waiting_entries': WaitlistEntrySerializer(waiting_entries, many=True).data,
        'all_entries': WaitlistEntrySerializer(all_entries, many=True).data
    }
    return Response(data)



@api_view(['POST'])
@permission_classes([IsAdminUser])
def accept_waitlist_entry(request, entry_id):
    """Accept a waitlist entry - Admin only"""
    try:
        entry = WaitlistEntry.objects.get(id=entry_id, is_accepted=False)
        entry.is_accepted = True
        entry.accepted_at = timezone.now()
        entry.save()
        
        # Update stats
        stats = WaitlistStats.get_current_stats()
        stats.update_counts()
        
        # Send acceptance email
        try:
            send_mail(
                subject="Félicitations ! Vous êtes accepté(e) sur NouMatch",
                message=f"""
Bonjour {entry.first_name},

Nous avons le plaisir de vous annoncer que votre inscription sur la liste d'attente NouMatch a été acceptée !

Vous faites désormais partie des premiers membres de notre communauté. Nous vous contacterons très prochainement pour vous donner accès à l'application.

À très bientôt,
L'équipe NouMatch
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[entry.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Email error: {e}")
        
        return Response({
            'success': True, 
            'message': f'{entry.first_name} {entry.last_name} a été accepté(e)'
        })
    except WaitlistEntry.DoesNotExist:
        return Response(
            {'error': 'Inscription non trouvée ou déjà acceptée'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_waitlist_entry(request, entry_id):
    """Delete a waitlist entry - Admin only"""
    try:
        entry = WaitlistEntry.objects.get(id=entry_id)
        entry.delete()
        
        # Update stats
        stats = WaitlistStats.get_current_stats()
        stats.update_counts()
        
        return Response({
            'success': True, 
            'message': 'Inscription supprimée avec succès'
        })
    except WaitlistEntry.DoesNotExist:
        return Response(
            {'error': 'Inscription non trouvée'}, 
            status=status.HTTP_404_NOT_FOUND
        )

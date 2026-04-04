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
import threading
from django.db.models import Max 
from django.utils import timezone
from .utils import send_waitlist_welcome_email 
from .email_api import send_waitlist_welcome_via_api


@api_view(["POST"])
@permission_classes([AllowAny])
def join_waitlist(request):
    gender = request.data.get("gender")
    email = request.data.get("email", "").strip().lower()
    first_name = request.data.get("first_name", "")
    last_name = request.data.get("last_name", "")

    if gender not in ["male", "female"]:
        return Response(
            {"success": False, "message": "Genre invalide."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Prevent duplicate registrations first
    existing_entry = WaitlistEntry.objects.filter(email__iexact=email).first()
    if existing_entry:
        return Response(
            {
                "success": True,
                "message": "Cet email est déjà inscrit sur la liste d'attente.",
                "data": {
                    "email": existing_entry.email,
                    "first_name": existing_entry.first_name,
                    "last_name": existing_entry.last_name,
                    "gender": existing_entry.gender,
                },
                "stats": {
                    "position": existing_entry.position,
                    "total_waiting": WaitlistEntry.objects.count(),
                },
                "already_registered": True,
            },
            status=status.HTTP_200_OK,
        )

    serializer = WaitlistEntrySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            stats = WaitlistStats.get_current_stats()

            # Enforce men balance rule
            if gender == "male" and not stats.can_accept_gender("male"):
                return Response(
                    {
                        "success": False,
                        "message": "Accès temporairement limité. Nous avons atteint la limite d'inscriptions pour le moment afin de garantir une communauté équilibrée et des rencontres de qualité. Merci de revenir plus tard.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            entry = serializer.save(email=email)

            # Faster position logic if you store numeric position
            last_position = (
                WaitlistEntry.objects.exclude(pk=entry.pk).aggregate(
                    max_pos=Max("position")
                )["max_pos"]
                or 0
            )
            entry.position = last_position + 1
            entry.save(update_fields=["position"])

            # Update stats after save
            stats.update_counts()

            total_waiting = stats.total_men_waiting + stats.total_women_waiting

            response_data = {
                "success": True,
                "message": "Inscription réussie !",
                "data": {
                    **serializer.data,
                    "position": entry.position,
                },
                "stats": {
                    "position": entry.position,
                    "total_waiting": total_waiting,
                },
            }

        # ✅ Send email using Brevo API (same method as OTP)
        try:
            # Import the function from utils (which now uses Brevo API)
            from .utils import send_waitlist_welcome_email
            email_sent = send_waitlist_welcome_email(entry)
            if email_sent:
                print(f"✅ Email de bienvenue envoyé à {entry.email}")
            else:
                print(f"❌ Échec d'envoi d'email à {entry.email}")
        except Exception as e:
            print(f"❌ Erreur lors de l'envoi d'email à {entry.email}: {str(e)}")
            # Don't block the response if email fails

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Waitlist error: {e}")
        return Response(
            {
                "success": False,
                "message": "Une erreur est survenue. Veuillez réessayer."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )








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

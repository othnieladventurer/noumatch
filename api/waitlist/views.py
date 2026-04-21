import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from .models import WaitlistEntry, WaitlistStats, ContactedArchive
from users.models import User
from rest_framework.permissions import IsAdminUser
import threading
from django.db.models import Max 
from django.utils import timezone

from .serializers import WaitlistEntrySerializer, ContactedArchiveSerializer

def send_waitlist_email_async(entry):
    def _send():
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
            logging.info(f"Email error: {e}")

    threading.Thread(target=_send, daemon=True).start()

# ==================== PUBLIC ENDPOINTS ====================

@api_view(["POST"])
@permission_classes([AllowAny])
def join_waitlist(request):
    gender = request.data.get("gender")
    email = request.data.get("email", "").strip().lower()

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

            # Only send email after DB commit succeeds
            transaction.on_commit(lambda: send_waitlist_email_async(entry))

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logging.info(f"Waitlist error: {e}")
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
@permission_classes([AllowAny])
def check_can_register(request):
    """Check if an email is authorized to register (must be in contacted waitlist or archive)"""
    email = request.query_params.get('email', '').strip().lower()
    
    if not email:
        return Response(
            {"can_register": False, "message": "Email requis"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if already registered
    if User.objects.filter(email=email).exists():
        return Response({
            "can_register": False,
            "message": "Cet email est déjà utilisé. Veuillez vous connecter."
        })
    
    # Check if in waitlist and contacted
    waitlist_entry = WaitlistEntry.objects.filter(email=email, contacted=True).first()
    
    if waitlist_entry:
        return Response({
            "can_register": True,
            "message": "Vous pouvez créer votre compte",
            "from_waitlist": True
        })
    
    # Check in contacted archive
    archived_entry = ContactedArchive.objects.filter(email=email).first()
    
    if archived_entry:
        return Response({
            "can_register": True,
            "message": "Vous pouvez créer votre compte",
            "from_archive": True
        })
    
    return Response({
        "can_register": False,
        "message": "Vous devez rejoindre la liste d'attente et être contacté par notre équipe avant de pouvoir vous inscrire."
    })

# ==================== ADMIN ENDPOINTS ====================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def waiting_entries(request):
    """Get all waiting entries (not accepted) - Admin only"""
    entries = WaitlistEntry.objects.filter(is_accepted=False).order_by('joined_at')
    serializer = WaitlistEntrySerializer(entries, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def accepted_entries_admin(request):
    """List all accepted entries"""
    entries = WaitlistEntry.objects.filter(is_accepted=True).order_by('-accepted_at')
    serializer = WaitlistEntrySerializer(entries, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def archived_entries_admin(request):
    """List all contacted archive entries"""
    archives = ContactedArchive.objects.all().order_by('-removed_at')
    serializer = ContactedArchiveSerializer(archives, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def contacted_entries(request):
    """Get all entries that have been marked as contacted but not yet accepted"""
    entries = WaitlistEntry.objects.filter(contacted=True, is_accepted=False).order_by('-joined_at')
    serializer = WaitlistEntrySerializer(entries, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def accept_waitlist_entry(request, entry_id):
    """Accept a waitlist entry - Admin only"""
    try:
        entry = WaitlistEntry.objects.get(id=entry_id, is_accepted=False)
        entry.is_accepted = True
        entry.accepted_at = timezone.now()
        entry.contacted = True  # Mark as contacted when accepted
        entry.save()
        
        # Update stats
        stats = WaitlistStats.get_current_stats()
        stats.update_counts()
        
        # Send acceptance email with registration link
        try:
            send_mail(
                subject="Félicitations ! Vous êtes accepté(e) sur NouMatch",
                message=f"""
Bonjour {entry.first_name},

Nous avons le plaisir de vous annoncer que votre inscription sur la liste d'attente NouMatch a été acceptée !

Vous faites désormais partie des premiers membres de notre communauté. Vous pouvez maintenant créer votre compte sur NouMatch en cliquant sur le lien ci-dessous :

{settings.FRONTEND_URL}/register

À très bientôt,
L'équipe NouMatch
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[entry.email],
                fail_silently=True,
            )
        except Exception as e:
            logging.info(f"Email error: {e}")
        
        return Response({
            'success': True, 
            'message': f'{entry.first_name} {entry.last_name} a été accepté(e)'
        })
    except WaitlistEntry.DoesNotExist:
        return Response(
            {'error': 'Inscription non trouvée ou déjà acceptée'}, 
            status=status.HTTP_404_NOT_FOUND
        )



@api_view(['POST'])
@permission_classes([IsAdminUser])
def mark_contacted(request, entry_id):
    """Move a waiting or accepted entry to ContactedArchive"""
    try:
        # Remove the is_accepted=False condition - get ANY entry by ID
        entry = WaitlistEntry.objects.get(id=entry_id)
    except WaitlistEntry.DoesNotExist:
        return Response({'error': 'Entry not found'}, status=404)
    
    notes = request.data.get('notes', '')
    with transaction.atomic():
        ContactedArchive.objects.create(
            first_name=entry.first_name,
            last_name=entry.last_name,
            email=entry.email,
            gender=entry.gender,
            reason='contacted' if not entry.is_accepted else 'accepted',
            notes=notes
        )
        entry.delete()
        
        # Update stats
        stats = WaitlistStats.get_current_stats()
        stats.update_counts()
    
    return Response({'success': True})





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

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_archived_entry(request, archive_id):
    """Delete an entry from ContactedArchive"""
    try:
        archive = ContactedArchive.objects.get(id=archive_id)
        archive.delete()
        return Response({'success': True})
    except ContactedArchive.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def bulk_mark_contacted(request):
    """Move multiple waiting entries to ContactedArchive respecting gender ratio"""
    entry_ids = request.data.get('entry_ids', [])
    notes = request.data.get('notes', 'Contacted via campaign')
    
    if not entry_ids:
        return Response({'error': 'No entries selected'}, status=400)
    
    entries = WaitlistEntry.objects.filter(id__in=entry_ids, is_accepted=False)
    
    if not entries.exists():
        return Response({'error': 'No valid entries found'}, status=404)
    
    with transaction.atomic():
        for entry in entries:
            # Mark as contacted before moving
            entry.contacted = True
            entry.save()
            
            # Move to archive
            ContactedArchive.objects.create(
                first_name=entry.first_name,
                last_name=entry.last_name,
                email=entry.email,
                gender=entry.gender,
                reason='contacted',
                notes=notes
            )
            entry.delete()
        
        # Update stats
        stats = WaitlistStats.get_current_stats()
        stats.update_counts()
    
    return Response({
        'success': True,
        'message': f'{entries.count()} entries moved to contacted archive'
    })

@api_view(['POST'])
@permission_classes([IsAdminUser])
def get_campaign_list(request):
    """Get a list of entries for contact campaign respecting gender ratio"""
    batch_size = request.data.get('batch_size', 10)
    women_ratio = request.data.get('women_ratio', 55)  # Default 55% women
    
    women_needed = int((women_ratio / 100) * batch_size)
    men_needed = batch_size - women_needed
    
    # Get waiting entries ordered by join date (FIFO)
    women_entries = WaitlistEntry.objects.filter(
        gender='female', 
        is_accepted=False,
        contacted=False  # Don't include already contacted
    ).order_by('joined_at')[:women_needed]
    
    men_entries = WaitlistEntry.objects.filter(
        gender='male', 
        is_accepted=False,
        contacted=False  # Don't include already contacted
    ).order_by('joined_at')[:men_needed]
    
    campaign_list = list(women_entries) + list(men_entries)
    
    serializer = WaitlistEntrySerializer(campaign_list, many=True)
    
    return Response({
        'campaign_list': serializer.data,
        'summary': {
            'total': len(campaign_list),
            'women': len(women_entries),
            'men': len(men_entries),
            'women_ratio': (len(women_entries) / len(campaign_list) * 100) if campaign_list else 0
        }
    })

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







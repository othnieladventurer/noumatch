from rest_framework import serializers
from .models import WaitlistEntry


class WaitlistEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistEntry
        fields = ['id', 'first_name', 'last_name', 'email', 'gender', 'position', 'joined_at']
        read_only_fields = ['id', 'position', 'joined_at']
    
    def validate_email(self, value):
        if WaitlistEntry.objects.filter(email=value, is_accepted=False).exists():
            raise serializers.ValidationError("Cet email est déjà sur la liste d'attente")
        return value
    

    




class WaitlistStatsSerializer(serializers.Serializer):
    total_waiting = serializers.IntegerField()
    women_waiting = serializers.IntegerField()
    men_waiting = serializers.IntegerField()
    women_accepted = serializers.IntegerField()
    men_accepted = serializers.IntegerField()
    can_join_as_woman = serializers.BooleanField()
    can_join_as_man = serializers.BooleanField()
    message = serializers.CharField(required=False)







    
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from users.models import User

class Command(BaseCommand):
    help = 'Set users as offline if they have been inactive for more than 5 minutes'

    def handle(self, *args, **options):
        timeout = timezone.now() - timedelta(minutes=5)
        # Find users who were online but haven't had activity in 5+ minutes
        stale_users = User.objects.filter(
            is_online=True,
            last_activity__lt=timeout
        )
        count = stale_users.update(is_online=False)
        self.stdout.write(
            self.style.SUCCESS(f'Successfully set {count} users offline')
        )



        
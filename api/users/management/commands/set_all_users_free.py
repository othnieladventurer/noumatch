from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = "Set all users to free account except superusers"

    def handle(self, *args, **kwargs):
        updated = User.objects.filter(is_superuser=False).update(account_type="free")
        self.stdout.write(f"Updated {updated} users to free")




        
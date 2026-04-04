from django.core.management.base import BaseCommand
from users.models import UserStats

class Command(BaseCommand):
    help = 'Refresh all user statistics'

    def handle(self, *args, **options):
        stats_objects = UserStats.objects.all()
        total = stats_objects.count()
        self.stdout.write(f"Refreshing stats for {total} users...")
        for i, stats in enumerate(stats_objects, 1):
            stats.update_all_stats()
            if i % 100 == 0:
                self.stdout.write(f"Processed {i}/{total}")
        self.stdout.write(self.style.SUCCESS("Done."))




        
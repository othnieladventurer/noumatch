# users/management/commands/delete_all_users_except_superusers.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Delete all users except superusers (is_superuser=True). Also preserves staff if --keep-staff is used.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-staff',
            action='store_true',
            help='Also keep users with is_staff=True (staff users, not just superusers)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Skip confirmation prompt (use with caution)'
        )

    def handle(self, *args, **options):
        keep_staff = options['keep_staff']
        dry_run = options['dry_run']
        no_input = options['no_input']

        # Determine which users to keep
        if keep_staff:
            keep_filter = {'is_superuser': True} | {'is_staff': True}
            keep_condition = "superusers and staff users"
        else:
            keep_filter = {'is_superuser': True}
            keep_condition = "superusers only"

        # Users to delete: all that are NOT in the keep set
        users_to_delete = User.objects.exclude(**keep_filter)
        count = users_to_delete.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS(f'No users to delete (already only {keep_condition} remain).'))
            return

        # Show what will be deleted
        self.stdout.write(self.style.WARNING(f'\n⚠️  You are about to delete {count} user(s).'))
        self.stdout.write(f'   Keeping: {keep_condition}\n')

        if not dry_run:
            # Confirm unless --no-input is given
            if not no_input:
                confirm = input(f'Type "YES" to confirm deletion of {count} users: ')
                if confirm != 'YES':
                    self.stdout.write(self.style.ERROR('Deletion cancelled.'))
                    return

            # Perform deletion
            with transaction.atomic():
                deleted_count, _ = users_to_delete.delete()
                self.stdout.write(self.style.SUCCESS(f'✅ Successfully deleted {deleted_count} user(s).'))
        else:
            # Dry run: list a sample of users that would be deleted
            sample = users_to_delete[:10]
            self.stdout.write('🔍 DRY RUN – No changes were made.')
            self.stdout.write(f'   Would delete {count} user(s):')
            for user in sample:
                self.stdout.write(f'     - {user.email} (id={user.id})')
            if count > 10:
                self.stdout.write(f'     ... and {count - 10} more.')



                
import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User
from faker import Faker
from datetime import datetime, timedelta

fake = Faker()

class Command(BaseCommand):
    help = 'Create bulk users for staging (55% women, 45% men)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--total',
            type=int,
            default=100,
            help='Total number of users to create (default: 100)'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='Staging2024',
            help='Default password for all users (default: Staging2024)'
        )

    def handle(self, *args, **options):
        total = options['total']
        password = options['password']
        
        women_count = int(total * 0.55)
        men_count = total - women_count
        
        self.stdout.write(self.style.SUCCESS(f'\n🚀 Creating {total} staging users...'))
        self.stdout.write(f'👩 Women: {women_count} (55%)')
        self.stdout.write(f'👨 Men: {men_count} (45%)')
        self.stdout.write(f'🔑 Password: {password}\n')
        
        # Haitian names
        female_names = ['Marie', 'Jeanette', 'Josette', 'Myriam', 'Sophie', 'Caroline', 'Nadia', 'Valérie', 'Fabienne', 'Kettly']
        male_names = ['Jean', 'Pierre', 'Joseph', 'Michel', 'Jacques', 'Antoine', 'Patrick', 'Richard', 'Daniel', 'Claude']
        last_names = ['Jean', 'Pierre', 'Joseph', 'Louis', 'Charles', 'Francois', 'Augustin', 'Baptiste', 'Desir', 'Felix']
        cities = ['Port-au-Prince', 'Cap-Haïtien', 'Jacmel', 'Les Cayes', 'Gonaïves', 'Saint-Marc', 'Jérémie']
        
        created = 0
        
        # Create women
        for i in range(women_count):
            first_name = random.choice(female_names)
            last_name = random.choice(last_names)
            email = f"{first_name.lower()}.{last_name.lower()}{i}@staging.noumatch.com"
            
            user = User(
                email=email,
                username=email.split('@')[0],
                first_name=first_name,
                last_name=last_name,
                gender='female',
                birth_date=fake.date_of_birth(minimum_age=22, maximum_age=45),
                location=random.choice(cities),
                country='Haiti',
                city=random.choice(cities),
                bio=fake.sentence(),
                is_verified=True,
                is_active=True,
                account_type=random.choice(['free', 'premium']),
                height=random.randint(155, 175),
                passions=', '.join(random.sample(['Musique', 'Danse', 'Voyage', 'Cuisine', 'Sport'], 3)),
                career=random.choice(['Ingénieur', 'Médecin', 'Enseignant', 'Entrepreneur', 'Designer']),
                education=random.choice(['Bachelor', 'Master', 'Doctorat']),
                hobbies=', '.join(random.sample(['Lecture', 'Natation', 'Cinéma', 'Randonnée'], 3))
            )
            user.set_password(password)
            user.save()
            created += 1
            self.stdout.write(f'✓ Created woman {created}/{women_count}: {first_name} {last_name}')
        
        # Create men
        for i in range(men_count):
            first_name = random.choice(male_names)
            last_name = random.choice(last_names)
            email = f"{first_name.lower()}.{last_name.lower()}{women_count + i}@staging.noumatch.com"
            
            user = User(
                email=email,
                username=email.split('@')[0],
                first_name=first_name,
                last_name=last_name,
                gender='male',
                birth_date=fake.date_of_birth(minimum_age=22, maximum_age=45),
                location=random.choice(cities),
                country='Haiti',
                city=random.choice(cities),
                bio=fake.sentence(),
                is_verified=True,
                is_active=True,
                account_type=random.choice(['free', 'premium']),
                height=random.randint(165, 190),
                passions=', '.join(random.sample(['Football', 'Technologie', 'Voyage', 'Musique'], 3)),
                career=random.choice(['Ingénieur', 'Médecin', 'Enseignant', 'Entrepreneur', 'Designer']),
                education=random.choice(['Bachelor', 'Master', 'Doctorat']),
                hobbies=', '.join(random.sample(['Football', 'Jeux', 'Cinéma', 'Musique'], 3))
            )
            user.set_password(password)
            user.save()
            created += 1
            self.stdout.write(f'✓ Created man {created - women_count}/{men_count}: {first_name} {last_name}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully created {created} staging users!'))
        self.stdout.write(f'📧 Sample emails:')
        self.stdout.write(f'   Woman: {female_names[0].lower()}.{last_names[0].lower()}0@staging.noumatch.com')
        self.stdout.write(f'   Man: {male_names[0].lower()}.{last_names[0].lower()}{women_count}@staging.noumatch.com')
        self.stdout.write(f'🔑 Password for all: {password}')







        
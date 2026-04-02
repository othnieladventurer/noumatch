import random
from django.core.management.base import BaseCommand
from users.models import User

class Command(BaseCommand):
    help = 'Update existing users with Haitian locations'

    def handle(self, *args, **options):
        users = User.objects.all()
        total = users.count()
        
        if total == 0:
            self.stdout.write(self.style.ERROR('No users found!'))
            return
        
        self.stdout.write(f'\n📍 Updating locations for {total} users...\n')
        
        # City distribution (55% Port-au-Prince)
        cities = []
        cities.extend(['Port-au-Prince'] * 55)
        cities.extend(['Jacmel'] * 10)
        cities.extend(['Les Cayes'] * 10)
        cities.extend(['Cap-Haïtien'] * 10)
        cities.extend(['Jérémie'] * 8)
        cities.extend(['Léogâne'] * 7)
        
        # Shuffle and ensure enough for all users
        random.shuffle(cities)
        while len(cities) < total:
            cities.append('Port-au-Prince')
        
        # Coordinates
        coords = {
            'Port-au-Prince': (18.5944, -72.3074),
            'Jacmel': (18.2342, -72.5353),
            'Les Cayes': (18.1931, -73.7460),
            'Cap-Haïtien': (19.7578, -72.2040),
            'Jérémie': (18.6492, -74.1139),
            'Léogâne': (18.5111, -72.6333)
        }
        
        updated = 0
        user_list = list(users)
        
        for i, user in enumerate(user_list):
            city = cities[i]
            lat, lng = coords[city]
            
            user.location = city
            user.city = city
            user.country = 'Haiti'
            user.latitude = lat + random.uniform(-0.05, 0.05)
            user.longitude = lng + random.uniform(-0.05, 0.05)
            user.save()
            
            updated += 1
            
            if updated % 50 == 0:
                self.stdout.write(f'   Updated {updated}/{total} users...')
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Updated {updated} users!\n'))
        
        # Show distribution
        self.stdout.write('📊 Distribution:')
        for city in coords.keys():
            count = User.objects.filter(city=city).count()
            percent = (count / total) * 100
            self.stdout.write(f'   {city}: {count} users ({percent:.1f}%)')



            
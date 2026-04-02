# users/management/commands/assign_profile_photos_api.py
import random
import requests
from io import BytesIO
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from users.models import User

class Command(BaseCommand):
    help = 'Assign profile photos using RandomUser API (Black individuals)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n📸 Fetching profile photos from RandomUser API...\n'))

        # Get users by gender
        women = list(User.objects.filter(gender='female'))
        men = list(User.objects.filter(gender='male'))

        self.stdout.write(f'👩 Women to process: {len(women)}')
        self.stdout.write(f'👨 Men to process: {len(men)}')

        # African countries for Black representation
        african_countries = ['ng', 'gh', 'za', 'ke', 'sn', 'ci']
        
        # Calculate how many photos needed (20 each minimum, or more if more users)
        women_photos_needed = max(20, len(women))
        men_photos_needed = max(20, len(men))

        # Fetch women's photos
        women_photos = self.fetch_photos('female', african_countries, women_photos_needed)
        
        # Fetch men's photos
        men_photos = self.fetch_photos('male', african_countries, men_photos_needed)

        # Assign photos to women
        self.stdout.write('\n📸 Assigning photos to women...')
        women_updated = self.assign_photos(women, women_photos)

        # Assign photos to men
        self.stdout.write('\n📸 Assigning photos to men...')
        men_updated = self.assign_photos(men, men_photos)

        # Summary
        self.stdout.write(self.style.SUCCESS('\n✅ PHOTO ASSIGNMENT COMPLETE!'))
        self.stdout.write(f'👩 Women updated: {women_updated}/{len(women)}')
        self.stdout.write(f'👨 Men updated: {men_updated}/{len(men)}')

    def fetch_photos(self, gender, countries, needed_count):
        """Fetch photos from RandomUser API"""
        photos = []
        batch_size = min(100, needed_count)
        
        countries_param = ','.join(countries)
        url = f'https://randomuser.me/api/?gender={gender}&nat={countries_param}&results={batch_size}'
        
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                data = response.json()
                for user in data.get('results', []):
                    photo_url = user['picture']['large']
                    photos.append(photo_url)
                self.stdout.write(f'   Fetched {len(photos)} {gender} photos')
            else:
                self.stdout.write(self.style.ERROR(f'   API error: {response.status_code}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   Error fetching: {str(e)}'))
        
        # If not enough photos, duplicate existing ones
        while len(photos) < needed_count:
            photos.extend(photos[:needed_count - len(photos)])
        
        return photos[:needed_count]

    def assign_photos(self, users, photo_urls):
        """Assign photos to users"""
        updated = 0
        
        for i, user in enumerate(users):
            photo_url = photo_urls[i % len(photo_urls)]
            
            try:
                response = requests.get(photo_url, timeout=10)
                if response.status_code == 200:
                    img_name = f"profile_{user.id}.jpg"
                    user.profile_photo.save(img_name, ContentFile(response.content), save=True)
                    updated += 1
                    
                    if updated % 10 == 0:
                        self.stdout.write(f'   Assigned to {updated}/{len(users)} users')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'   Failed for {user.email}: {str(e)}'))
        
        return updated



        
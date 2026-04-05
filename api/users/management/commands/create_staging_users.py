import random
from django.core.management.base import BaseCommand
from users.models import User
from faker import Faker

fake = Faker()

class Command(BaseCommand):
    help = 'Create 20 realistic users with bios and scores'

    def handle(self, *args, **kwargs):
        total_women = 10
        total_men = 10
        password = "Staging2024"

        self.stdout.write(self.style.SUCCESS("\n🚀 Creating 20 realistic users...\n"))

        female_names = ['Marie', 'Jeanette', 'Josette', 'Myriam', 'Sophie', 'Caroline', 'Nadia', 'Valérie', 'Fabienne', 'Kettly']
        male_names = ['Jean', 'Pierre', 'Joseph', 'Michel', 'Jacques', 'Antoine', 'Patrick', 'Richard', 'Daniel', 'Claude']
        last_names = ['Jean', 'Pierre', 'Joseph', 'Louis', 'Charles', 'Francois', 'Augustin', 'Baptiste', 'Desir', 'Felix']
        cities = ['Port-au-Prince', 'Cap-Haïtien', 'Jacmel', 'Les Cayes', 'Gonaïves']

        # 🔥 Realistic bios
        bios_female = [
            "Toujours souriante 😊 J’aime la musique, les sorties entre amis et les bons moments. Si tu sais me faire rire, on va bien s’entendre 😉",
            "Entre travail et famille, je prends le temps de profiter de la vie 🌸 Amoureuse des choses simples et des belles conversations",
            "Passionnée de danse et de musique kompa 💃 J’aime les personnes vraies et respectueuses",
            "J’aime voyager, découvrir et apprendre ✈️ Ici pour rencontrer quelqu’un de sérieux mais sans prise de tête",
            "Simple, ambitieuse et un peu têtue 😄 J’aime les gens sincères et les discussions profondes",
            "Fan de plage et coucher de soleil 🌅 Si tu aimes profiter de la vie, on va bien s’entendre",
            "Toujours positive ✨ Je crois que les meilleures rencontres commencent par une bonne conversation",
            "Entrepreneure dans l’âme 💼 mais j’aime aussi rire et profiter des petits moments",
            "J’aime la musique, les sorties et passer du temps avec les bonnes personnes ❤️",
            "Naturelle et spontanée, je cherche quelqu’un avec qui partager de bons moments 😊"
        ]

        bios_male = [
            "Ambitieux et toujours motivé 💪 J’aime travailler dur mais aussi profiter de la vie",
            "Fan de football ⚽ et de bons moments entre amis. Ici pour du vrai",
            "Simple, respectueux et déterminé. J’aime les conversations vraies",
            "Toujours prêt pour une nouvelle aventure ✈️ J’aime découvrir et apprendre",
            "Entre travail et passions, je cherche quelqu’un avec qui partager de bons moments 😊",
            "J’aime rire, sortir et profiter de la vie 😄 Si tu es positive, on va bien s’entendre",
            "Calme mais drôle quand il faut 😉 J’apprécie les personnes simples",
            "Passionné par ce que je fais 💼 mais j’aime aussi prendre du temps pour moi",
            "Sport, musique et bonne énergie 🎵 Toujours ouvert à une belle rencontre",
            "Je crois que les bonnes choses prennent du temps ⏳ Ici pour quelque chose de vrai"
        ]

        created = 0

        # -------- CREATE WOMEN --------
        for i in range(total_women):
            first_name = female_names[i]
            last_name = random.choice(last_names)
            email = f"{first_name.lower()}.{last_name.lower()}{i}@staging.noumatch.com"

            user = User(
                email=email,
                username=email.split('@')[0],
                first_name=first_name,
                last_name=last_name,
                gender='female',
                birth_date=fake.date_of_birth(minimum_age=18, maximum_age=30),
                location=random.choice(cities),
                country='Haiti',
                city=random.choice(cities),
                bio=bios_female[i],
                is_verified=True,
                is_active=True,
                account_type=random.choice(['free', 'free', 'premium']),
                height=random.randint(155, 175),
            )

            # Optional fields (to create realism)
            if random.random() > 0.2:
                user.passions = ', '.join(random.sample(['Musique', 'Danse', 'Voyage', 'Cuisine', 'Sport'], 3))
            if random.random() > 0.3:
                user.hobbies = ', '.join(random.sample(['Lecture', 'Cinéma', 'Plage', 'Randonnée'], 3))
            if random.random() > 0.4:
                user.career = random.choice(['Étudiante', 'Entrepreneure', 'Designer'])
            if random.random() > 0.5:
                user.education = random.choice(['Secondaire', 'Université'])

            user.set_password(password)

            # 🔥 Calculate scores
            user.profile_score = user.calculate_profile_score()
            user.score = user.calculate_global_score()

            user.save()

            created += 1
            self.stdout.write(f'✓ Woman {created}/10: {first_name}')

        # -------- CREATE MEN --------
        for i in range(total_men):
            first_name = male_names[i]
            last_name = random.choice(last_names)
            email = f"{first_name.lower()}.{last_name.lower()}{i+10}@staging.noumatch.com"

            user = User(
                email=email,
                username=email.split('@')[0],
                first_name=first_name,
                last_name=last_name,
                gender='male',
                birth_date=fake.date_of_birth(minimum_age=18, maximum_age=30),
                location=random.choice(cities),
                country='Haiti',
                city=random.choice(cities),
                bio=bios_male[i],
                is_verified=True,
                is_active=True,
                account_type=random.choice(['free', 'free', 'premium']),
                height=random.randint(165, 190),
            )

            if random.random() > 0.2:
                user.passions = ', '.join(random.sample(['Football', 'Musique', 'Voyage', 'Technologie'], 3))
            if random.random() > 0.3:
                user.hobbies = ', '.join(random.sample(['Football', 'Jeux', 'Musique', 'Cinéma'], 3))
            if random.random() > 0.4:
                user.career = random.choice(['Étudiant', 'Entrepreneur', 'Technicien'])
            if random.random() > 0.5:
                user.education = random.choice(['Secondaire', 'Université'])

            user.set_password(password)

            user.profile_score = user.calculate_profile_score()
            user.score = user.calculate_global_score()

            user.save()

            created += 1
            self.stdout.write(f'✓ Man {created-10}/10: {first_name}')

        self.stdout.write(self.style.SUCCESS(f'\n✅ Done: {created} users created'))
        self.stdout.write(f'🔑 Password: {password}')

        
# users/management/commands/seed_women.py
"""
Seed the discovery feed with 25 female profiles (18-35) so a male account sees them.

This is the committed counterpart of the inline script used to seed production, and
produces the same rows: femme1..femme25@seed.noumatch.local, same field set, same
photo source.

Idempotent: existing emails are skipped, so re-running never duplicates.

    python manage.py seed_women --count 25
    python manage.py seed_women --count 25 --with-viewer

Photos: the curated <BASE_DIR>/seed_portraits portraits when that folder exists
(sharp 880x1184 studio portraits), otherwise randomuser.me restricted to African
nationalities — whose largest size is only 128px and looks blurry at card size.

Windows note: console output is ASCII-only and stdout is forced to UTF-8 with
errors="replace", so this cannot die on a cp1252 UnicodeEncodeError.
"""
import os
import random
import sys
from datetime import date, timedelta

import requests
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone

from users.models import User

PHOTO_API = "https://randomuser.me/api/?gender=female&nat=ng,gh,za,ke,sn,ci&results={n}&noinfo"

FIRST_NAMES = [
    "Nadège", "Wideline", "Sabine", "Mirlande", "Ketsia", "Roseline", "Fabiola",
    "Naïka", "Judith", "Sandra", "Vanessa", "Christelle", "Lovely", "Gaëlle",
    "Michaëlle", "Sherlyne", "Daphnée", "Rachelle", "Bertha", "Claudine",
    "Esther", "Ginette", "Marlène", "Suze", "Tamara",
]

LAST_NAMES = [
    "Jean-Baptiste", "Pierre-Louis", "Augustin", "Desir", "Felix", "Saint-Fleur",
    "Joseph", "Cadet", "Etienne", "Lafleur", "Dorvil", "Michel", "Charles",
    "François", "Noël", "Sylvain", "Toussaint",
]

CITIES = [
    "Port-au-Prince", "Pétion-Ville", "Delmas", "Carrefour", "Cap-Haïtien",
    "Gonaïves", "Les Cayes", "Jacmel", "Saint-Marc", "Hinche", "Jérémie",
]

# Same bios the production run stored.
BIOS = [
    "Toujours souriante, j'aime la musique, les sorties entre amis et les vraies conversations.",
    "Entre travail et famille, je prends le temps de profiter de la vie et des gens sincères.",
    "Passionnée de danse et de kompa, ici pour rencontrer quelqu'un de respectueux.",
    "J'aime voyager, découvrir et apprendre. Je cherche du sérieux, sans prise de tête.",
    "Simple, ambitieuse et un peu têtue. Les discussions profondes, c'est mon truc.",
    "Fan de plage et de coucher de soleil. Si tu aimes profiter de la vie, on va s'entendre.",
    "Toujours positive. Les meilleures rencontres commencent par une bonne conversation.",
    "Entrepreneure dans l'âme, mais j'aime aussi rire et profiter des petits moments.",
    "La foi, la famille, les amis. Le reste, ça se construit à deux.",
    "Naturelle et spontanée, je cherche quelqu'un avec qui partager de beaux moments.",
]


class Command(BaseCommand):
    help = "Create 25 female profiles (18-35) with photos so a male account has a populated feed."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=25)
        parser.add_argument("--password", default="Staging2024")
        parser.add_argument("--min-age", type=int, default=18)
        parser.add_argument("--max-age", type=int, default=35)
        parser.add_argument("--with-viewer", action="store_true", help="Also create a demo male viewer account.")
        parser.add_argument("--no-photos", action="store_true", help="Skip photo download (offline).")

    def handle(self, *args, **options):
        self.force_utf8_stdout()

        count = options["count"]
        password = options["password"]
        min_age = options["min_age"]
        max_age = options["max_age"]

        self.out("[seed] starting: %d women, ages %d-%d" % (count, min_age, max_age))

        photos = [] if options["no_photos"] else self.collect_photos(count)
        created = 0
        reused = 0

        for i in range(count):
            first = FIRST_NAMES[i % len(FIRST_NAMES)]
            last = random.choice(LAST_NAMES)
            email = "femme%d@seed.noumatch.local" % (i + 1)

            if User.objects.filter(email=email).exists():
                reused += 1
                continue

            age = random.randint(min_age, max_age)
            birth = date.today() - timedelta(days=age * 365 + random.randint(0, 364))
            city = random.choice(CITIES)

            user = User(
                email=email,
                username="femme%d" % (i + 1),
                first_name=first,
                last_name=last,
                gender="female",
                birth_date=birth,
                location=city,
                country="Haïti",
                city=city,
                bio=BIOS[i % len(BIOS)],
                is_verified=True,
                is_active=True,
                last_activity=timezone.now() - timedelta(minutes=random.randint(1, 600)),
                account_type="free",
                height=random.randint(155, 178),
                profile_score=0,
                score=0,
            )
            user.set_password("Seed-%d-%d" % (i, random.randint(100000, 999999)))
            user.save()

            if photos:
                self.attach_photo(user, photos[i % len(photos)])

            user.profile_score = user.calculate_profile_score()
            user.score = user.calculate_global_score()
            user.save(update_fields=["profile_score", "score"])

            created += 1
            self.out("  + %s %s, %d ans, %s" % (first, last, age, city))

        if options["with_viewer"]:
            self.ensure_viewer(password)

        seeded = User.objects.filter(email__endswith="@seed.noumatch.local")
        self.out(
            "[done] created=%d skipped=%d | seeded=%d with_photo=%d | active_women=%d"
            % (
                created,
                reused,
                seeded.count(),
                seeded.filter(profile_photo__isnull=False).exclude(profile_photo="").count(),
                User.objects.filter(gender="female", is_active=True).count(),
            )
        )

    # ------------------------------------------------------------------ helpers

    def force_utf8_stdout(self):
        """Windows consoles default to cp1252 and blow up on non-ASCII output."""
        for stream in (sys.stdout, sys.stderr):
            reconfigure = getattr(stream, "reconfigure", None)
            if reconfigure is None:
                continue
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass

    def out(self, message):
        """Never let console encoding abort a seed that already wrote rows."""
        try:
            self.stdout.write(message)
        except UnicodeEncodeError:
            self.stdout.write(message.encode("ascii", "replace").decode("ascii"))

    def collect_photos(self, count):
        """Prefer the curated local portraits; fall back to the remote API."""
        from django.conf import settings

        folder = getattr(settings, "BASE_DIR", None)
        if folder:
            portraits = os.path.join(str(folder), "seed_portraits")
            if os.path.isdir(portraits):
                files = sorted(
                    os.path.join(portraits, name)
                    for name in os.listdir(portraits)
                    if name.lower().endswith((".jpg", ".jpeg", ".png"))
                )
                if files:
                    self.out("[photos] %d curated portraits in seed_portraits" % len(files))
                    return files
        return self.fetch_photos(count)

    def fetch_photos(self, count):
        self.out("[photos] fetching from randomuser.me (African nationals)")
        try:
            response = requests.get(PHOTO_API.format(n=min(count, 50)), timeout=30)
            response.raise_for_status()
            urls = [item["picture"]["large"] for item in response.json().get("results", [])]
            self.out("[photos] %d ready" % len(urls))
            return urls
        except Exception as error:
            self.out("[photos] fetch failed (%s); continuing without photos" % error)
            return []

    def attach_photo(self, user, source):
        try:
            if source.startswith(("http://", "https://")):
                response = requests.get(source, timeout=20)
                response.raise_for_status()
                payload = response.content
            else:
                with open(source, "rb") as handle:
                    payload = handle.read()
            user.profile_photo.save("seed_%d.jpg" % user.id, ContentFile(payload), save=True)
        except Exception as error:
            self.out("[photos] failed for %s: %s" % (user.email, error))

    def ensure_viewer(self, password):
        email = "demo.homme@noumatch.local"
        viewer = User.objects.filter(email=email).first()
        if viewer:
            viewer.set_password(password)
            viewer.gender = "male"
            viewer.is_active = True
            viewer.is_verified = True
            viewer.save()
            self.out("[viewer] refreshed %s" % email)
            return viewer

        viewer = User(
            email=email,
            username="demo.homme",
            first_name="Demo",
            last_name="Homme",
            gender="male",
            birth_date=date(1998, 6, 15),
            location="Port-au-Prince",
            country="Haïti",
            city="Port-au-Prince",
            bio="Compte de test pour visualiser le feed.",
            is_verified=True,
            is_active=True,
            account_type="god_mode",
            height=180,
        )
        viewer.set_password(password)
        viewer.save()
        self.out("[viewer] created %s / %s" % (email, password))
        return viewer

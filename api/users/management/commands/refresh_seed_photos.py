"""Replace the photos of the seeded women with high-resolution portraits.

Existing ``femme*@seed.noumatch.local`` rows keep their data; only ``profile_photo``
is swapped for a sharper, correctly targeted portrait.

    # from URLs (production: the container downloads them itself)
    python manage.py refresh_seed_photos --urls-file /tmp/noumatch_photo_urls.txt

    # from a local folder (development), files named in assignment order
    python manage.py refresh_seed_photos --dir ../seed_portraits

Idempotent enough to re-run: each run simply overwrites the photo again.
"""
import os
import sys

import requests
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError

from users.models import User

SEED_EMAIL_SUFFIX = "@seed.noumatch.local"


class Command(BaseCommand):
    help = "Swap the seeded women's profile photos for higher-resolution portraits."

    def add_arguments(self, parser):
        parser.add_argument("--urls-file", help="File with one image URL per line.")
        parser.add_argument("--urls", help="Comma-separated image URLs.")
        parser.add_argument("--dir", help="Local folder of images, sorted by filename.")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        self.force_utf8_stdout()

        users = list(User.objects.filter(email__endswith=SEED_EMAIL_SUFFIX, is_active=True).order_by("id"))
        if not users:
            raise CommandError("No seeded women found (%s)." % SEED_EMAIL_SUFFIX)

        sources = self.collect_sources(options)
        if not sources:
            raise CommandError("No images given: pass --urls-file, --urls or --dir.")
        if len(sources) < len(users):
            self.out("[warn] %d images for %d profiles; the list will be reused in order" % (len(sources), len(users)))

        self.out("[start] %d profiles, %d images" % (len(users), len(sources)))
        if options["dry_run"]:
            for index, user in enumerate(users):
                self.out("  %s <- %s" % (user.email, sources[index % len(sources)]))
            return

        updated = failed = 0
        for index, user in enumerate(users):
            source = sources[index % len(sources)]
            try:
                payload = self.read(source)
                if len(payload) < 15000:
                    raise ValueError("suspiciously small image (%d bytes)" % len(payload))
                name = "portrait_%s.jpg" % user.id
                user.profile_photo.save(name, ContentFile(payload), save=True)
                updated += 1
                self.out("  + %s (%d bytes)" % (user.email, len(payload)))
            except Exception as error:
                failed += 1
                self.out("  ! %s: %s" % (user.email, error))

        with_photo = User.objects.filter(email__endswith=SEED_EMAIL_SUFFIX).exclude(profile_photo="").count()
        self.out("[done] updated=%d failed=%d with_photo=%d" % (updated, failed, with_photo))

    # ------------------------------------------------------------------ helpers

    def collect_sources(self, options):
        if options["urls_file"]:
            with open(options["urls_file"], "r", encoding="utf-8") as handle:
                return [line.strip() for line in handle if line.strip()]
        if options["urls"]:
            return [item.strip() for item in options["urls"].split(",") if item.strip()]
        if options["dir"]:
            folder = options["dir"]
            names = sorted(
                name for name in os.listdir(folder) if name.lower().endswith((".jpg", ".jpeg", ".png"))
            )
            return [os.path.join(folder, name) for name in names]
        return []

    def read(self, source):
        if source.startswith(("http://", "https://")):
            response = requests.get(
                source,
                timeout=60,
                headers={"User-Agent": "Mozilla/5.0 (compatible; NouMatchSeed/1.0)"},
            )
            response.raise_for_status()
            if "image" not in response.headers.get("Content-Type", ""):
                raise ValueError("unexpected content type %s" % response.headers.get("Content-Type"))
            return response.content
        with open(source, "rb") as handle:
            return handle.read()

    def force_utf8_stdout(self):
        for stream in (sys.stdout, sys.stderr):
            reconfigure = getattr(stream, "reconfigure", None)
            if reconfigure is None:
                continue
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass

    def out(self, message):
        try:
            self.stdout.write(message)
        except UnicodeEncodeError:
            self.stdout.write(message.encode("ascii", "replace").decode("ascii"))

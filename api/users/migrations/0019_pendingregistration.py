from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0018_feedvisibilityboost"),
    ]

    operations = [
        migrations.CreateModel(
            name="PendingRegistration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("first_name", models.CharField(max_length=30)),
                ("last_name", models.CharField(blank=True, max_length=30)),
                ("birth_date", models.DateField()),
                ("gender", models.CharField(blank=True, choices=[("male", "Male"), ("female", "Female"), ("other", "Other")], max_length=10)),
                ("profile_photo", models.ImageField(blank=True, null=True, upload_to="profiles/pending/")),
                ("password_hash", models.CharField(max_length=128)),
                ("country", models.CharField(blank=True, max_length=100)),
                ("city", models.CharField(blank=True, max_length=100)),
                ("latitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("code", models.CharField(max_length=4)),
                ("is_used", models.BooleanField(default=False)),
                ("attempts", models.IntegerField(default=0)),
                ("max_attempts", models.IntegerField(default=5)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]

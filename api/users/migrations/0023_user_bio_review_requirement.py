from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0022_user_photo_review_requirement"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="bio_review_reason",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="bio_review_required",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="bio_review_required_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="bio_review_trigger_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]

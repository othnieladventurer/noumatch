from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0021_pendingregistration_otp_sent_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="photo_review_reason",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="photo_review_required",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="photo_review_required_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="photo_review_trigger_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]

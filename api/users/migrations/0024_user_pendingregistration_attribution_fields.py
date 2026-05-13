from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0023_user_bio_review_requirement"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="landing_page",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="signup_source",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="user",
            name="utm_campaign",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="utm_content",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="utm_medium",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="utm_source",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="utm_term",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pendingregistration",
            name="landing_page",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pendingregistration",
            name="signup_source",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="pendingregistration",
            name="utm_campaign",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pendingregistration",
            name="utm_content",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pendingregistration",
            name="utm_medium",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pendingregistration",
            name="utm_source",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pendingregistration",
            name="utm_term",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]

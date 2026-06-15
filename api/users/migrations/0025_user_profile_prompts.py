from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0024_user_pendingregistration_attribution_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_prompts',
            field=models.JSONField(blank=True, default=list),
        ),
    ]

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0020_rename_users_feedvi_viewer__f4f6d2_idx_users_feedv_viewer__bbf2e2_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="pendingregistration",
            name="otp_sent_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]

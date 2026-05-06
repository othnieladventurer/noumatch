from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("admin_dashboard", "0003_reportcase_closure_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationEmailTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(choices=[("new_like", "New Like"), ("new_match", "New Match"), ("new_message", "New Message")], max_length=30, unique=True)),
                ("name", models.CharField(max_length=120)),
                ("is_enabled", models.BooleanField(default=True)),
                ("subject_template", models.CharField(max_length=255)),
                ("html_template", models.TextField()),
                ("text_template", models.TextField(blank=True)),
                ("sample_payload", models.JSONField(blank=True, default=dict)),
                ("from_name", models.CharField(blank=True, default="NouMatch", max_length=120)),
                ("reply_to", models.EmailField(blank=True, default="", max_length=254)),
                ("version", models.PositiveIntegerField(default=1)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="updated_notification_email_templates", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["event_type"],
            },
        ),
        migrations.CreateModel(
            name="NotificationEmailLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("recipient_email", models.EmailField(max_length=254)),
                ("event_type", models.CharField(choices=[("new_like", "New Like"), ("new_match", "New Match"), ("new_message", "New Message")], db_index=True, max_length=30)),
                ("template_version", models.PositiveIntegerField(default=1)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("sent", "Sent"), ("failed", "Failed"), ("skipped", "Skipped")], db_index=True, default="pending", max_length=20)),
                ("subject_rendered", models.CharField(blank=True, max_length=255)),
                ("html_rendered", models.TextField(blank=True)),
                ("text_rendered", models.TextField(blank=True)),
                ("provider_message_id", models.CharField(blank=True, max_length=255)),
                ("provider_response", models.JSONField(blank=True, default=dict)),
                ("error_message", models.TextField(blank=True)),
                ("retry_count", models.PositiveIntegerField(default=0)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("related_object_type", models.CharField(blank=True, max_length=100)),
                ("related_object_id", models.PositiveIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("recipient", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="notification_email_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["event_type", "status", "-created_at"], name="admin_dashb_event_t_7dd12f_idx"),
                    models.Index(fields=["recipient_email", "-created_at"], name="admin_dashb_recipie_a88ffa_idx"),
                ],
            },
        ),
    ]

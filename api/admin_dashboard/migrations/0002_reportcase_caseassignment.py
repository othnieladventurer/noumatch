from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("report", "0001_initial"),
        ("admin_dashboard", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ReportCase",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("open", "Open"), ("in_progress", "In Progress"), ("resolved", "Resolved"), ("closed", "Closed")], default="open", max_length=20)),
                ("priority", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical")], default="medium", max_length=20)),
                ("department", models.CharField(choices=[("safety", "Safety"), ("trust", "Trust"), ("support", "Support"), ("moderation", "Moderation")], default="safety", max_length=20)),
                ("due_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_report_cases", to=settings.AUTH_USER_MODEL)),
                ("report", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cases", to="report.report")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="CaseAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notes", models.TextField(blank=True)),
                ("active", models.BooleanField(default=True)),
                ("assigned_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("assigned_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_cases", to=settings.AUTH_USER_MODEL)),
                ("case", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="assignments", to="admin_dashboard.reportcase")),
                ("staff_user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="case_assignments", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-assigned_at"],
            },
        ),
        migrations.AddIndex(
            model_name="reportcase",
            index=models.Index(fields=["status", "priority"], name="admin_dashb_status_932f4a_idx"),
        ),
        migrations.AddIndex(
            model_name="reportcase",
            index=models.Index(fields=["department", "created_at"], name="admin_dashb_departm_2f5f53_idx"),
        ),
        migrations.AddIndex(
            model_name="caseassignment",
            index=models.Index(fields=["staff_user", "active"], name="admin_dashb_staff_u_6d421e_idx"),
        ),
        migrations.AddIndex(
            model_name="caseassignment",
            index=models.Index(fields=["case", "active"], name="admin_dashb_case_id_4061da_idx"),
        ),
    ]

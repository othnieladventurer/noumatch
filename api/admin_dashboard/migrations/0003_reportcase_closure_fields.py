from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admin_dashboard", "0002_reportcase_caseassignment"),
    ]

    operations = [
        migrations.AddField(
            model_name="reportcase",
            name="action_taken",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="reportcase",
            name="close_summary",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="reportcase",
            name="closed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="reportcase",
            name="final_note",
            field=models.TextField(blank=True),
        ),
    ]

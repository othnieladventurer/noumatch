from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0017_userengagementscore"),
    ]

    operations = [
        migrations.CreateModel(
            name="FeedVisibilityBoost",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source", models.CharField(choices=[("new_user_injection", "New User Injection"), ("new_user_reciprocal", "New User Reciprocal"), ("underexposed_recovery", "Underexposed Recovery"), ("mutual_like_stack", "Mutual Like Stack"), ("admin_boost", "Admin Boost"), ("admin_reduce", "Admin Reduce"), ("admin_force_inject", "Admin Force Inject")], default="admin_boost", max_length=32)),
                ("boost_score", models.IntegerField(default=0)),
                ("remaining_views", models.PositiveIntegerField(default=5)),
                ("expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("target", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="feed_boosts_for_target", to=settings.AUTH_USER_MODEL)),
                ("viewer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="feed_boosts_for_viewer", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "unique_together": {("viewer", "target", "source")},
            },
        ),
        migrations.AddIndex(
            model_name="feedvisibilityboost",
            index=models.Index(fields=["viewer", "expires_at"], name="users_feedvi_viewer__f4f6d2_idx"),
        ),
        migrations.AddIndex(
            model_name="feedvisibilityboost",
            index=models.Index(fields=["target", "expires_at"], name="users_feedvi_target__cd5378_idx"),
        ),
    ]

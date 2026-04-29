# admin_dashboard/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone




class ProfileImpression(models.Model):
    SWIPE_CHOICES = [
        ('like', 'Like'),
        ('pass', 'Pass'),
        ('none', 'None'),
    ]

    viewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='impressions_made')
    viewed = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='impressions_received')
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    feed_position = models.PositiveSmallIntegerField()
    ranking_score = models.FloatField()
    session_id = models.CharField(max_length=64, db_index=True)
    device_type = models.CharField(max_length=20, blank=True, null=True)
    was_swiped = models.BooleanField(default=False)
    swipe_action = models.CharField(max_length=10, choices=SWIPE_CHOICES, default='none')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['viewer', 'timestamp']),
            models.Index(fields=['viewed', 'timestamp']),
            models.Index(fields=['session_id', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.viewer.email} viewed {self.viewed.email} at {self.timestamp}"


class ReportCase(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]
    DEPARTMENT_CHOICES = [
        ("safety", "Safety"),
        ("trust", "Trust"),
        ("support", "Support"),
        ("moderation", "Moderation"),
    ]

    report = models.ForeignKey("report.Report", on_delete=models.CASCADE, related_name="cases")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, default="safety")
    final_note = models.TextField(blank=True)
    action_taken = models.TextField(blank=True)
    close_summary = models.TextField(blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_report_cases")
    due_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["department", "created_at"]),
        ]

    def __str__(self):
        return f"Case #{self.id} for report #{self.report_id}"


class CaseAssignment(models.Model):
    case = models.ForeignKey(ReportCase, on_delete=models.CASCADE, related_name="assignments")
    staff_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="case_assignments")
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="assigned_cases")
    notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-assigned_at"]
        indexes = [
            models.Index(fields=["staff_user", "active"]),
            models.Index(fields=["case", "active"]),
        ]

    def __str__(self):
        return f"Assignment #{self.id} case #{self.case_id} -> {self.staff_user_id}"

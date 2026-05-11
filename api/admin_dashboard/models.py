# admin_dashboard/models.py
import logging

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.template import Context, Template, TemplateSyntaxError


logger = logging.getLogger(__name__)




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
            models.Index(fields=["status", "priority"], name="admin_dashb_status_932f4a_idx"),
            models.Index(fields=["department", "created_at"], name="admin_dashb_departm_2f5f53_idx"),
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
            models.Index(fields=["staff_user", "active"], name="admin_dashb_staff_u_6d421e_idx"),
            models.Index(fields=["case", "active"], name="admin_dashb_case_id_4061da_idx"),
        ]

    def __str__(self):
        return f"Assignment #{self.id} case #{self.case_id} -> {self.staff_user_id}"


class CaseActivityLog(models.Model):
    EVENT_CHOICES = [
        ("case_opened", "Case Opened"),
        ("owner_assigned", "Owner Assigned"),
        ("owner_reassigned", "Owner Reassigned"),
        ("owner_released", "Owner Released"),
        ("status_changed", "Status Changed"),
        ("notes_updated", "Notes Updated"),
        ("action_recorded", "Action Recorded"),
        ("closure_updated", "Closure Updated"),
        ("case_closed", "Case Closed"),
        ("case_reopened", "Case Reopened"),
    ]

    case = models.ForeignKey(ReportCase, on_delete=models.CASCADE, related_name="activity_logs")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="case_activity_logs",
    )
    event_type = models.CharField(max_length=40, choices=EVENT_CHOICES)
    title = models.CharField(max_length=180)
    detail = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["case", "-created_at"], name="adm_case_act_idx"),
            models.Index(fields=["event_type", "-created_at"], name="adm_case_evt_idx"),
        ]

    def __str__(self):
        return f"Case activity #{self.id} for case #{self.case_id}"


class NotificationEmailTemplate(models.Model):
    EVENT_CHOICES = [
        ("new_like", "New Like"),
        ("new_match", "New Match"),
        ("new_message", "New Message"),
    ]

    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES, unique=True)
    name = models.CharField(max_length=120)
    is_enabled = models.BooleanField(default=True)
    subject_template = models.CharField(max_length=255)
    html_template = models.TextField()
    text_template = models.TextField(blank=True)
    sample_payload = models.JSONField(default=dict, blank=True)
    from_name = models.CharField(max_length=120, blank=True, default="NouMatch")
    reply_to = models.EmailField(blank=True, default="")
    version = models.PositiveIntegerField(default=1)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_notification_email_templates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["event_type"]

    def __str__(self):
        return f"{self.get_event_type_display()} email template"

    def render_subject(self, context_data=None):
        try:
            return Template(self.subject_template).render(Context(context_data or {})).strip()
        except TemplateSyntaxError as exc:
            logger.warning("Invalid notification email subject template for %s: %s", self.event_type, exc)
            return (self.subject_template or "").strip()

    def render_html(self, context_data=None):
        try:
            return Template(self.html_template).render(Context(context_data or {})).strip()
        except TemplateSyntaxError as exc:
            logger.warning("Invalid notification email HTML template for %s: %s", self.event_type, exc)
            return (self.html_template or "").strip()

    def render_text(self, context_data=None):
        if self.text_template:
            try:
                return Template(self.text_template).render(Context(context_data or {})).strip()
            except TemplateSyntaxError as exc:
                logger.warning("Invalid notification email text template for %s: %s", self.event_type, exc)
                return (self.text_template or "").strip()
        return ""


class NotificationEmailLog(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("failed", "Failed"),
        ("skipped", "Skipped"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_email_logs",
        null=True,
        blank=True,
    )
    recipient_email = models.EmailField()
    event_type = models.CharField(max_length=30, choices=NotificationEmailTemplate.EVENT_CHOICES, db_index=True)
    template_version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", db_index=True)
    subject_rendered = models.CharField(max_length=255, blank=True)
    html_rendered = models.TextField(blank=True)
    text_rendered = models.TextField(blank=True)
    provider_message_id = models.CharField(max_length=255, blank=True)
    provider_response = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    related_object_type = models.CharField(max_length=100, blank=True)
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type", "status", "-created_at"], name="admin_dashb_event_t_7dd12f_idx"),
            models.Index(fields=["recipient_email", "-created_at"], name="admin_dashb_recipie_a88ffa_idx"),
        ]

    def __str__(self):
        return f"{self.recipient_email} - {self.event_type} - {self.status}"

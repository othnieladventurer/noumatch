from django.db import models
from django.conf import settings
from django.utils import timezone

class Report(models.Model):
    REPORT_REASONS = [
        ('fake_profile', 'Fake Profile'),
        ('harassment', 'Harassment or Bullying'),
        ('inappropriate_content', 'Inappropriate Photos/Content'),
        ('scam', 'Scam or Fraud'),
        ('underage', 'User May Be Underage'),
        ('offensive_language', 'Offensive Language'),
        ('spam', 'Spam'),
        ('privacy_violation', 'Privacy Violation'),
        ('other', 'Other'),
    ]
    
    REPORT_STATUS = [
        ('pending', 'Pending Review'),
        ('investigating', 'Under Investigation'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]
    
    # Who filed the report
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports_filed'
    )
    
    # Who is being reported
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports_received'
    )
    
    # Match context (if reported from a match)
    match = models.ForeignKey(
        'matches.Match',  # Assuming you have a matches app
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports'
    )
    
    reason = models.CharField(
        max_length=50,
        choices=REPORT_REASONS
    )
    
    description = models.TextField(
        blank=True,
        help_text="Provide additional details about the issue"
    )
    
    status = models.CharField(
        max_length=20,
        choices=REPORT_STATUS,
        default='pending'
    )
    
    admin_notes = models.TextField(
        blank=True,
        help_text="Internal notes for admin review"
    )
    
    # Evidence (optional)
    screenshot = models.ImageField(
        upload_to='reports/screenshots/',
        blank=True,
        null=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Action taken
    action_taken = models.TextField(
        blank=True,
        help_text="What action was taken (warning, ban, etc.)"
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['reporter', 'reported_user']),
        ]
    
    def __str__(self):
        return f"Report #{self.id}: {self.reporter} reported {self.reported_user} - {self.get_reason_display()}"
    
    def resolve(self, action_taken=None):
        """Mark report as resolved"""
        self.status = 'resolved'
        if action_taken:
            self.action_taken = action_taken
        self.save()
    
    def dismiss(self, reason=None):
        """Dismiss the report"""
        self.status = 'dismissed'
        if reason:
            self.admin_notes = reason
        self.save()



        
from django.db import models
from django.core.validators import MinLengthValidator



class WaitlistEntry(models.Model):
    class Gender(models.TextChoices):
        MALE = 'male', 'Homme'
        FEMALE = 'female', 'Femme'
    
    first_name = models.CharField(max_length=100, validators=[MinLengthValidator(2)])
    last_name = models.CharField(max_length=100, validators=[MinLengthValidator(2)])
    email = models.EmailField(unique=True)
    gender = models.CharField(max_length=10, choices=Gender.choices)
    
    is_accepted = models.BooleanField(default=False)
    position = models.PositiveIntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    contacted = models.BooleanField(default=False)  # NEW: contacted via email

    
    class Meta:
        ordering = ['joined_at']
        indexes = [
            models.Index(fields=['gender', 'is_accepted']),
            models.Index(fields=['joined_at']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.email}"





class WaitlistStats(models.Model):
    total_men_waiting = models.PositiveIntegerField(default=0)
    total_women_waiting = models.PositiveIntegerField(default=0)
    total_men_accepted = models.PositiveIntegerField(default=0)
    total_women_accepted = models.PositiveIntegerField(default=0)
    target_women_percentage = models.FloatField(default=55.0)
    target_men_percentage = models.FloatField(default=45.0)
    updated_at = models.DateTimeField(auto_now=True)
    
    @classmethod
    def get_current_stats(cls):
        stats, created = cls.objects.get_or_create(id=1)
        stats.update_counts()
        return stats
    
    def update_counts(self):
        self.total_men_waiting = WaitlistEntry.objects.filter(
            gender='male', is_accepted=False
        ).count()
        self.total_women_waiting = WaitlistEntry.objects.filter(
            gender='female', is_accepted=False
        ).count()
        self.total_men_accepted = WaitlistEntry.objects.filter(
            gender='male', is_accepted=True
        ).count()
        self.total_women_accepted = WaitlistEntry.objects.filter(
            gender='female', is_accepted=True
        ).count()
        self.save()
    
    def can_accept_gender(self, gender):
        """Check if we can accept more of this gender based on ratio"""
        # Women are always allowed
        if gender == 'female':
            return True
        
        # For men: only allow if they won't exceed the target ratio
        total_accepted = self.total_men_accepted + self.total_women_accepted
        
        # If no one has been accepted yet, allow based on waiting list only
        if total_accepted == 0:
            total_waiting = self.total_men_waiting + self.total_women_waiting
            if total_waiting == 0:
                return True
            women_waiting_pct = (self.total_women_waiting / total_waiting) * 100
            # Don't allow more men if women are below target
            return women_waiting_pct >= self.target_women_percentage
        
        # Calculate current ratio of accepted users
        current_women_pct = (self.total_women_accepted / total_accepted) * 100
        
        # Allow men if women are above or equal to target
        if current_women_pct >= self.target_women_percentage:
            return True
        
        # Check if adding one more man would drop women below target
        new_women_pct = (self.total_women_accepted / (total_accepted + 1)) * 100
        return new_women_pct >= self.target_women_percentage - 5  # 5% buffer for smoother operation

    def get_waitlist_message(self, gender):
        """Get appropriate message based on current ratio"""
        if gender == 'female':
            return None
        else:  # male
            if self.can_accept_gender('male'):
                return None
            else:
                return "Accès temporairement limité pour garantir une communauté équilibrée. Merci de revenir plus tard."
            






class ContactedArchive(models.Model):
    """Stores waitlist entries that have been removed (contacted, refused, etc.)"""
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    gender = models.CharField(max_length=10, choices=WaitlistEntry.Gender.choices)
    removed_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=50, choices=[
        ('accepted', 'Accepted'),
        ('refused', 'Refused'),
        ('contacted', 'Contacted & Removed'),
        ('other', 'Other'),
    ])
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.email} - {self.reason} - {self.removed_at.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ['-removed_at']

        





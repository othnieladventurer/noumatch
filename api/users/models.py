from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone

from django.conf import settings



# Create your models here.
class UserManager(BaseUserManager):

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            username=username,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")

        return self.create_user(email, username, password, **extra_fields)





class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=30)

    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)

    bio = models.TextField(blank=True)
    birth_date = models.DateField(null=True, blank=True)

    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)

    location = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    profile_photo = models.ImageField(upload_to="profiles/main/", blank=True, null=True)

    is_verified = models.BooleanField(default=False)

    # 🔥 Scores
    profile_score = models.PositiveIntegerField(default=0)
    score = models.PositiveIntegerField(default=0)

    ACCOUNT_TYPE_CHOICES = [
        ("free", "Free"),
        ("premium", "Premium"),
        ("god_mode", "God Mode"),
    ]
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES, default="free")

    height = models.PositiveIntegerField(null=True, blank=True)
    passions = models.TextField(blank=True)
    career = models.CharField(max_length=100, blank=True)
    education = models.CharField(max_length=100, blank=True)
    hobbies = models.TextField(blank=True)
    favorite_music = models.TextField(blank=True)

    # Activity
    last_activity = models.DateTimeField(null=True, blank=True)
    is_online = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email

    # =========================
    # 🔥 SAFE SAVE OVERRIDE
    # =========================
    def save(self, *args, **kwargs):
        is_new = self.pk is None

        if not is_new:
            old = User.objects.filter(pk=self.pk).first()

            tracked_fields = [
                "profile_photo", "bio", "gender", "birth_date",
                "city", "country", "passions", "hobbies",
                "career", "education", "favorite_music"
            ]

            changed = any(
                getattr(old, f) != getattr(self, f)
                for f in tracked_fields
            ) if old else False
        else:
            changed = False

        super().save(*args, **kwargs)

        # 🔥 Update scores ONLY if relevant fields changed
        if not is_new and changed:
            User.objects.filter(pk=self.pk).update(
                profile_score=self.calculate_profile_score(),
                score=self.calculate_global_score()
            )

    # -------------------------
    # 🔥 PROFILE SCORE
    # -------------------------
    def calculate_profile_score(self):
        score = 0

        if self.profile_photo:
            score += 25
        if self.bio:
            score += 15
        if self.gender:
            score += 5
        if self.birth_date:
            score += 5
        if self.city and self.country:
            score += 10
        if self.passions:
            score += 10
        if self.hobbies:
            score += 10
        if self.career:
            score += 5
        if self.education:
            score += 5
        if self.favorite_music:
            score += 5

        return min(score, 100)

    # -------------------------
    # 🔥 GLOBAL SCORE - FIXED
    # -------------------------
    def calculate_global_score(self):
        score = 0

        # Profile quality (40%)
        score += int(self.profile_score * 0.4)

        # Engagement (30%) - FIXED: use correct field names from UserStats
        engagement_score = 0
        if hasattr(self, "stats"):
            # Use total_matches instead of matches_count
            matches_count = getattr(self.stats, 'total_matches', 0)
            engagement_score = min(matches_count * 5, 30)
        score += engagement_score

        # Trust (30%) - FIXED: use correct field names
        trust_score = 30
        if hasattr(self, "stats"):
            reports_received = getattr(self.stats, 'total_reports_received', 0)
            blocks_received = getattr(self.stats, 'total_blocks_received', 0)
            penalty = (reports_received * 10) + (blocks_received * 5)
            trust_score = max(30 - penalty, 0)

        score += trust_score

        return min(score, 100)

    # -------------------------
    # 🔥 SAFE UPDATE SCORES
    # -------------------------
    def update_scores(self):
        profile = self.calculate_profile_score()
        global_score = self.calculate_global_score()

        User.objects.filter(pk=self.pk).update(
            profile_score=profile,
            score=global_score
        )

    # -------------------------
    # 🔥 ACTIVITY METHODS - FIXED
    # -------------------------
    def update_last_activity(self):
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])
        # Don't call calculate_global_score here - let the stats update handle it

    def set_online(self):
        if not self.is_online:
            self.is_online = True
            self.last_activity = timezone.now()
            self.save(update_fields=['is_online', 'last_activity'])

    def set_offline(self):
        if self.is_online:
            self.is_online = False
            self.save(update_fields=['is_online'])


class UserStats(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stats'
    )
    
    # Swipe activity
    total_likes_given = models.PositiveIntegerField(default=0)
    total_likes_received = models.PositiveIntegerField(default=0)
    total_passes_given = models.PositiveIntegerField(default=0)
    total_passes_received = models.PositiveIntegerField(default=0)
    
    # Match activity
    total_matches = models.PositiveIntegerField(default=0)
    active_matches = models.PositiveIntegerField(default=0)
    
    # Message activity
    total_messages_sent = models.PositiveIntegerField(default=0)
    total_messages_received = models.PositiveIntegerField(default=0)
    
    # Safety
    total_blocks_given = models.PositiveIntegerField(default=0)
    total_blocks_received = models.PositiveIntegerField(default=0)
    total_reports_filed = models.PositiveIntegerField(default=0)
    total_reports_received = models.PositiveIntegerField(default=0)
    
    # Engagement
    last_active = models.DateTimeField(null=True, blank=True)
    account_age_days = models.PositiveIntegerField(default=0)
    streak_days = models.PositiveIntegerField(default=0)
    
    # Timestamp for last stats update
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Statistics"
        verbose_name_plural = "User Statistics"
    
    def __str__(self):
        return f"Stats for {self.user.email}"
    
    def update_all_stats(self):
        """Recompute all stats from existing data"""
        from interactions.models import Like, Pass, DailySwipe
        from matches.models import Match
        from block.models import Block
        from report.models import Report
        from chat.models import Message, Conversation
        
        user = self.user
        
        # Likes
        self.total_likes_given = Like.objects.filter(from_user=user).count()
        self.total_likes_received = Like.objects.filter(to_user=user).count()
        
        # Passes
        self.total_passes_given = Pass.objects.filter(from_user=user).count()
        self.total_passes_received = Pass.objects.filter(to_user=user).count()
        
        # Matches
        matches = Match.objects.filter(models.Q(user1=user) | models.Q(user2=user))
        self.total_matches = matches.count()
        
        # Active matches (has messages in last 7 days)
        seven_days_ago = timezone.now() - timezone.timedelta(days=7)
        active_match_ids = []
        for match in matches:
            conv = getattr(match, 'conversation', None)
            if conv and conv.last_message_at and conv.last_message_at >= seven_days_ago:
                active_match_ids.append(match.id)
        self.active_matches = len(active_match_ids)
        
        # Messages
        convs = Conversation.objects.filter(match__in=matches)
        self.total_messages_sent = Message.objects.filter(conversation__in=convs, sender=user).count()
        self.total_messages_received = Message.objects.filter(conversation__in=convs).exclude(sender=user).count()
        
        # Blocks
        self.total_blocks_given = Block.objects.filter(blocker=user).count()
        self.total_blocks_received = Block.objects.filter(blocked=user).count()
        
        # Reports
        self.total_reports_filed = Report.objects.filter(reporter=user).count()
        self.total_reports_received = Report.objects.filter(reported_user=user).count()
        
        # Last active
        self.last_active = user.last_activity or user.date_joined
        
        # Account age in days
        delta = timezone.now() - user.date_joined
        self.account_age_days = delta.days
        
        # Streak days (simplified)
        swipe_dates = DailySwipe.objects.filter(user=user).values_list('date', flat=True).distinct()
        self.streak_days = swipe_dates.count()
        
        self.save()


class UserEngagementScore(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='engagement_scorecard',
    )
    onboarding_points = models.IntegerField(default=0)
    activity_points = models.IntegerField(default=0)
    quality_points = models.IntegerField(default=0)
    penalty_points = models.IntegerField(default=0)
    total_points = models.IntegerField(default=0)

    profile_completion_percent = models.PositiveSmallIntegerField(default=0)
    engagement_score = models.PositiveSmallIntegerField(default=0)
    quality_score = models.PositiveSmallIntegerField(default=0)
    trust_score = models.PositiveSmallIntegerField(default=0)
    overall_score = models.PositiveSmallIntegerField(default=0)

    # By default we cap at 99 so no user reaches 100 without explicit admin decision.
    allow_perfect_score = models.BooleanField(default=False)
    score_cap = models.PositiveSmallIntegerField(default=99)

    breakdown = models.JSONField(default=dict, blank=True)
    last_calculated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Engagement Score"
        verbose_name_plural = "User Engagement Scores"

    def __str__(self):
        return f"{self.user.email} score={self.overall_score} points={self.total_points}"


        


            











class UserPhoto(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="photos"
    )
    image = models.ImageField(upload_to="profiles/gallery/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at"]

    def save(self, *args, **kwargs):
        # Enforce max 10 photos per user
        if not self.pk and self.user.photos.count() >= 10:
            raise ValueError("Maximum of 10 photos allowed.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} photo"






class OTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='otp')
    code = models.CharField(max_length=4)  # Changed to 4 digits
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=5)  # 5 attempts maximum

    def is_valid(self):
        """Check if OTP is still valid (not used and within 5 minutes)"""
        if self.is_used:
            return False
        now = timezone.now()
        # 5 minutes = 300 seconds
        if (now - self.created_at).total_seconds() > 300:
            return False
        return True

    def can_attempt(self):
        """Check if user can still attempt verification"""
        return self.attempts < self.max_attempts

    def increment_attempts(self):
        """Increment attempt counter"""
        self.attempts += 1
        self.save(update_fields=['attempts'])

    def __str__(self):
        return f"{self.user.email} - {self.code}"









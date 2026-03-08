from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone





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
    username = models.CharField(max_length=30, unique=False)

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

    INTEREST_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("everyone", "Everyone"),
    ]
    interested_in = models.CharField(max_length=10, choices=INTEREST_CHOICES, blank=True)

    location = models.CharField(max_length=100, blank=True)

    # MAIN PROFILE PHOTO
    profile_photo = models.ImageField(upload_to="profiles/main/", blank=True, null=True)

    is_verified = models.BooleanField(default=False)

    height = models.PositiveIntegerField(null=True, blank=True)
    passions = models.TextField(blank=True)
    career = models.CharField(max_length=100, blank=True)
    education = models.CharField(max_length=100, blank=True)
    hobbies = models.TextField(blank=True)
    favorite_music = models.TextField(blank=True)

    # Online Status Fields
    last_activity = models.DateTimeField(null=True, blank=True)
    is_online = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    lock_until = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email
    
    def update_last_activity(self):
        """Update user's last activity timestamp"""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity', 'is_online'])
    
    def set_online(self):
        """Set user as online"""
        if not self.is_online:
            self.is_online = True
            self.last_activity = timezone.now()
            self.save(update_fields=['is_online', 'last_activity'])
    
    def set_offline(self):
        """Set user as offline"""
        if self.is_online:
            self.is_online = False
            self.save(update_fields=['is_online'])





            


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



# users/utils.py
import random
from django.core.mail import send_mail
from django.conf import settings

def generate_otp():
    """Generate a 6-digit OTP code"""
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])

def send_otp_email(user, otp_code):
    """Send OTP email using Django's send_mail (SMTP)"""
    subject = 'Your NouMatch Verification Code'
    message = f'Hello {user.first_name},\n\nYour verification code is: {otp_code}\n\nThis code will expire in 10 minutes.\n\nThank you for joining NouMatch!'
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [user.email]
    send_mail(subject, message, from_email, recipient_list, fail_silently=False)

    
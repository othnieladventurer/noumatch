import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _send_brevo_email(payload):
    api_key = getattr(settings, "BREVO_API_KEY", "")
    if not api_key:
        logger.error("BREVO_API_KEY is not configured")
        return False

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers=headers,
            timeout=10,
        )
        if response.status_code == 201:
            return True

        logger.error("Brevo email failed with status %s", response.status_code)
        return False
    except Exception as exc:
        logger.error("Brevo email exception: %s", exc)
        return False


def send_otp_via_api(user, otp_code):
    """Send OTP verification email via Brevo."""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset=\"UTF-8\">
      <title>Verify Your NouMatch Account</title>
      <style>
        body {{ font-family: Arial, sans-serif; color: #222; background: #f5f7fb; margin: 0; }}
        .container {{ max-width: 640px; margin: 0 auto; padding: 24px; }}
        .header {{ background: linear-gradient(135deg, #ff4d6d, #ff8fa3); color: #fff; border-radius: 14px 14px 0 0; padding: 28px; text-align: center; }}
        .content {{ background: #fff; border-radius: 0 0 14px 14px; padding: 28px; }}
        .code {{ font-size: 34px; font-weight: 700; letter-spacing: 6px; color: #ff4d6d; font-family: monospace; }}
        .notice {{ background: #fff5f7; border-left: 4px solid #ff4d6d; padding: 10px 12px; margin-top: 16px; border-radius: 8px; }}
      </style>
    </head>
    <body>
      <div class=\"container\">
        <div class=\"header\"><h1 style=\"margin:0;\">NouMatch</h1></div>
        <div class=\"content\">
          <p>Hello {user.first_name or user.email},</p>
          <p>Use this verification code to confirm your account:</p>
          <p class=\"code\">{otp_code}</p>
          <div class=\"notice\">This code expires in 5 minutes.</div>
        </div>
      </div>
    </body>
    </html>
    """

    text_content = (
        f"Hello {user.first_name or user.email},\n\n"
        f"Your NouMatch verification code is: {otp_code}\n"
        "This code expires in 5 minutes."
    )

    payload = {
        "sender": {"name": "NouMatch", "email": "no-reply@noumatch.com"},
        "to": [{"email": user.email, "name": f"{user.first_name} {user.last_name}".strip()}],
        "subject": "Your NouMatch verification code",
        "htmlContent": html_content,
        "textContent": text_content,
    }

    sent = _send_brevo_email(payload)
    if sent:
        logger.info("OTP email sent to %s", user.email)
    return sent


def send_password_reset_email(user, reset_url):
    """Send password reset email via Brevo."""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset=\"UTF-8\">
        <title>Reset Your NouMatch Password</title>
        <style>
            body {{ font-family: Arial, sans-serif; color: #222; margin: 0; padding: 0; background: #f5f7fb; }}
            .container {{ max-width: 640px; margin: 0 auto; padding: 24px; }}
            .header {{ background: linear-gradient(135deg, #ff4d6d, #ff8fa3); color: #fff; border-radius: 14px 14px 0 0; padding: 28px; text-align: center; }}
            .content {{ background: #fff; border-radius: 0 0 14px 14px; padding: 28px; }}
            .button {{ display: inline-block; background: #ff4d6d; color: #fff !important; text-decoration: none; font-weight: 700; padding: 12px 22px; border-radius: 10px; margin: 16px 0; }}
            .link {{ word-break: break-all; color: #ff4d6d; font-size: 13px; }}
            .notice {{ background: #fff5f7; border-left: 4px solid #ff4d6d; padding: 10px 12px; margin-top: 16px; border-radius: 8px; font-size: 14px; }}
            .footer {{ margin-top: 18px; text-align: center; color: #777; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class=\"container\">
            <div class=\"header\">
                <h1 style=\"margin:0;\">NouMatch</h1>
                <p style=\"margin:8px 0 0;\">Password Reset Request</p>
            </div>
            <div class=\"content\">
                <p>Hello {user.first_name or user.email},</p>
                <p>We received a request to reset your NouMatch password.</p>
                <p><a class=\"button\" href=\"{reset_url}\" target=\"_blank\" rel=\"noopener noreferrer\">Reset My Password</a></p>
                <p>If the button does not work, copy and paste this link:</p>
                <p class=\"link\">{reset_url}</p>
                <div class=\"notice\">For your security, this link expires automatically. If you did not request this, you can ignore this email.</div>
            </div>
            <div class=\"footer\">(c) 2026 NouMatch. All rights reserved.</div>
        </div>
    </body>
    </html>
    """

    text_content = (
        f"Hello {user.first_name or user.email},\n\n"
        "We received a request to reset your NouMatch password.\n"
        f"Reset link: {reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    payload = {
        "sender": {"name": "NouMatch", "email": "no-reply@noumatch.com"},
        "to": [{"email": user.email, "name": f"{user.first_name} {user.last_name}".strip()}],
        "subject": "Reset your NouMatch password",
        "htmlContent": html_content,
        "textContent": text_content,
    }

    sent = _send_brevo_email(payload)
    if sent:
        logger.info("Password reset email sent to %s", user.email)
    return sent

import requests
import json
from django.conf import settings

def send_otp_via_api(user, otp_code):
    """Send OTP using Brevo API - Fast and reliable"""
    
    # API endpoint
    url = "https://api.brevo.com/v3/smtp/email"
    
    # HTML Email Template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff4d6d, #ff8fa3); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">NouMatch</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2>Hello {user.first_name}!</h2>
                <p>Thank you for joining NouMatch. Use the code below to verify your email:</p>
                <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #ff4d6d;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #ff4d6d;">{otp_code}</span>
                </div>
                <p style="color: #666;">This code expires in <strong>10 minutes</strong>.</p>
                <hr style="margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">If you didn't request this, please ignore this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text fallback
    text_content = f"""
Hello {user.first_name}!

Your verification code is: {otp_code}

This code expires in 10 minutes.

If you didn't request this, please ignore this email.

© 2026 NouMatch
"""
    
    # API Payload
    payload = {
        "sender": {
            "name": "NouMatch",
            "email": "no-reply@noumatch.com"
        },
        "to": [
            {
                "email": user.email,
                "name": f"{user.first_name} {user.last_name}"
            }
        ],
        "subject": "Your NouMatch Verification Code",
        "htmlContent": html_content,
        "textContent": text_content,
        "headers": {
            "X-Mailin-custom": "OTP verification"
        }
    }
    
    # API Headers
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    try:
        # Make the API call with short timeout
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        
        if response.status_code == 201:
            print(f"✅ OTP sent to {user.email}")
            return True
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"⏰ Timeout sending to {user.email}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False




        
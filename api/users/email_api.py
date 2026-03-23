import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from django.conf import settings

def send_otp_via_api(user, otp_code):
    """Send OTP using Brevo API with SMTP fallback"""
    
    # Try API first
    try:
        url = "https://api.brevo.com/v3/smtp/email"
        
        # HTML Email Template with 90 seconds expiration
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your NouMatch Account</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .header h1 {{
                    color: white;
                    margin: 0;
                    font-size: 28px;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }}
                .code-container {{
                    background: white;
                    padding: 20px;
                    text-align: center;
                    margin: 20px 0;
                    border-radius: 8px;
                    border: 2px solid #ff4d6d;
                }}
                .code {{
                    font-size: 36px;
                    font-weight: bold;
                    letter-spacing: 5px;
                    color: #ff4d6d;
                    font-family: monospace;
                }}
                .warning {{
                    color: #ff4d6d;
                    font-weight: bold;
                    text-align: center;
                    margin: 15px 0;
                    padding: 10px;
                    background: #fff0f0;
                    border-radius: 5px;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 20px;
                    font-size: 12px;
                    color: #999;
                }}
                hr {{
                    margin: 20px 0;
                    border: none;
                    border-top: 1px solid #e0e0e0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>NouMatch</h1>
                </div>
                <div class="content">
                    <h2>Hello {user.first_name}!</h2>
                    <p>Thank you for joining NouMatch. Use the code below to verify your email address:</p>
                    
                    <div class="code-container">
                        <span class="code">{otp_code}</span>
                    </div>
                    
                    <div class="warning">
                        ⚠️ This code expires in <strong>90 seconds</strong> for security reasons!
                    </div>
                    
                    <p>If you didn't request this verification, please ignore this email.</p>
                    
                    <hr>
                    
                    <p style="font-size: 12px; color: #666;">
                        This is an automated message from NouMatch. Please do not reply to this email.
                    </p>
                </div>
                <div class="footer">
                    <p>© 2026 NouMatch. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text fallback
        text_content = f"""
Hello {user.first_name}!

Thank you for joining NouMatch. Use the code below to verify your email address:

{otp_code}

⚠️ IMPORTANT: This code expires in 90 seconds for security reasons!

If you didn't request this verification, please ignore this email.

© 2026 NouMatch. All rights reserved.
"""
        
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
            "subject": "Your NouMatch Verification Code (Expires in 90 Seconds)",
            "htmlContent": html_content,
            "textContent": text_content,
            "headers": {
                "X-Mailin-custom": "OTP verification - 90 seconds expiry"
            }
        }
        
        headers = {
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json"
        }
        
        # Debug logging
        print(f"📧 Attempting to send OTP to {user.email}")
        print(f"🔐 OTP Code: {otp_code}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        print(f"📡 Response status: {response.status_code}")
        
        if response.status_code == 201:
            print(f"✅ API: OTP sent successfully to {user.email}")
            return True
        else:
            print(f"⚠️ API failed ({response.status_code}): {response.text}")
            print(f"🔄 Falling back to SMTP...")
            return send_otp_via_smtp(user, otp_code)
            
    except requests.exceptions.Timeout:
        print(f"⏰ API timeout, falling back to SMTP")
        return send_otp_via_smtp(user, otp_code)
    except Exception as e:
        print(f"⚠️ API error: {e}, falling back to SMTP")
        return send_otp_via_smtp(user, otp_code)


def send_otp_via_smtp(user, otp_code):
    """Fallback to SMTP if API fails"""
    try:
        subject = "Your NouMatch Verification Code (Expires in 90 Seconds)"
        
        # HTML content for SMTP
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Verify Your NouMatch Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #ff4d6d, #ff8fa3); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">NouMatch</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2>Hello {user.first_name}!</h2>
                    <p>Thank you for joining NouMatch. Use the code below to verify your email address:</p>
                    <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #ff4d6d;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #ff4d6d;">{otp_code}</span>
                    </div>
                    <div style="color: #ff4d6d; font-weight: bold; text-align: center; margin: 15px 0; padding: 10px; background: #fff0f0; border-radius: 5px;">
                        ⚠️ This code expires in <strong>90 seconds</strong> for security reasons!
                    </div>
                    <p>If you didn't request this verification, please ignore this email.</p>
                    <hr style="margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">© 2026 NouMatch. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text content
        plain_content = f"""
Hello {user.first_name}!

Thank you for joining NouMatch. Use the code below to verify your email address:

{otp_code}

⚠️ IMPORTANT: This code expires in 90 seconds for security reasons!

If you didn't request this verification, please ignore this email.

© 2026 NouMatch. All rights reserved.
"""
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = settings.DEFAULT_FROM_EMAIL
        msg['To'] = user.email
        
        # Attach both plain text and HTML versions
        part1 = MIMEText(plain_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ SMTP: OTP sent successfully to {user.email}")
        return True
        
    except Exception as e:
        print(f"❌ SMTP failed: {e}")
        return False
import requests
import logging
from django.conf import settings

# Set up logging
logger = logging.getLogger(__name__)

def send_otp_via_api(user, otp_code):
    """Send OTP using Brevo API with full logging"""
    
    try:
        url = "https://api.brevo.com/v3/smtp/email"
        
        # Debug: Check if API key exists
        api_key = getattr(settings, 'BREVO_API_KEY', None)
        if not api_key:
            error_msg = "❌ BREVO_API_KEY is NOT configured in environment variables!"
            logger.error(error_msg)
            logging.info(error_msg)
            return False
        
        # Log API key presence (first few chars only for security)
        logging.info(f"🔑 API Key loaded: {api_key[:15]}... (length: {len(api_key)})")
        logger.info(f"API Key loaded: {api_key[:15]}... (length: {len(api_key)})")
        
        # HTML Email Template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
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
            "api-key": api_key,
            "content-type": "application/json"
        }
        
        # Log email attempt
        logging.info(f"📧 Attempting to send OTP to {user.email}")
        logging.info(f"🔐 OTP Code: {otp_code}")
        logger.info(f"Attempting to send OTP to {user.email}")
        
        # Make the API call
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        # Log response
        logging.info(f"📡 Response Status: {response.status_code}")
        logging.info(f"📡 Response Body: {response.text}")
        logger.info(f"Brevo API Response: {response.status_code}")
        
        if response.status_code == 201:
            logging.info(f"✅ SUCCESS: OTP sent successfully to {user.email}")
            logger.info(f"OTP sent successfully to {user.email}")
            return True
        else:
            error_msg = f"❌ API Error: {response.status_code} - {response.text}"
            logging.info(error_msg)
            logger.error(error_msg)
            return False
            
    except requests.exceptions.Timeout:
        error_msg = f"⏰ Timeout sending OTP to {user.email}"
        logging.info(error_msg)
        logger.error(error_msg)
        return False
        
    except requests.exceptions.ConnectionError:
        error_msg = f"🔌 Connection error sending OTP to {user.email}"
        logging.info(error_msg)
        logger.error(error_msg)
        return False
        
    except Exception as e:
        error_msg = f"❌ Unexpected error: {e}"
        logging.info(error_msg)
        logger.error(error_msg)
        return False

        

# waitlist/email_api.py
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def send_waitlist_welcome_via_api(entry):
    """Send waitlist welcome email using Brevo API (same as OTP)"""
    
    try:
        url = "https://api.brevo.com/v3/smtp/email"
        
        # Check API key
        api_key = getattr(settings, 'BREVO_API_KEY', None)
        if not api_key:
            error_msg = "❌ BREVO_API_KEY is NOT configured!"
            logger.error(error_msg)
            print(error_msg)
            return False
        
        print(f"🔑 API Key loaded: {api_key[:15]}...")
        
        # Determine content based on gender
        if entry.gender == 'female':
            subject = '✨ Bienvenue sur la liste d\'attente NouMatch'
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Bienvenue NouMatch</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #ff4d6d, #ff8fa3); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .header h1 {{ color: white; margin: 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .position {{ background: white; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #ff4d6d; }}
                    .position-number {{ font-size: 32px; font-weight: bold; color: #ff4d6d; }}
                    .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #999; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>💖 NouMatch</h1>
                    </div>
                    <div class="content">
                        <h2>Bonjour {entry.first_name or 'Chère future membre'} !</h2>
                        <p>Merci de votre inscription à la liste d'attente de <strong>NouMatch</strong>.</p>
                        
                        <div class="position">
                            <p>✨ Votre position sur la liste :</p>
                            <div class="position-number">#{entry.position}</div>
                        </div>
                        
                        <p>Vous faites désormais partie des personnes qui seront informées en priorité pour notre pré-lancement.</p>
                        
                        <p>Nous vous contacterons très bientôt avec les prochaines étapes.</p>
                        
                        <p>À très bientôt,<br><strong>L'équipe NouMatch ❤️</strong></p>
                    </div>
                    <div class="footer">
                        <p>© 2026 NouMatch. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            text_content = f"""Bonjour {entry.first_name or 'Chère future membre'},

Merci de votre inscription à la liste d'attente de NouMatch.

✨ Votre position sur la liste : #{entry.position}

Vous faites désormais partie des personnes qui seront informées en priorité pour notre pré-lancement.

Nous vous contacterons très bientôt avec les prochaines étapes.

À très bientôt,
L'équipe NouMatch ❤️
"""
        else:
            subject = '🚀 Bienvenue sur la liste d\'attente NouMatch'
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Bienvenue NouMatch</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #007bff, #0056b3); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .header h1 {{ color: white; margin: 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .position {{ background: white; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #007bff; }}
                    .position-number {{ font-size: 32px; font-weight: bold; color: #007bff; }}
                    .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #999; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚀 NouMatch</h1>
                    </div>
                    <div class="content">
                        <h2>Bonjour {entry.first_name or 'Cher futur membre'} !</h2>
                        <p>Merci de votre inscription à la liste d'attente de <strong>NouMatch</strong>.</p>
                        
                        <div class="position">
                            <p>🚀 Votre position sur la liste :</p>
                            <div class="position-number">#{entry.position}</div>
                        </div>
                        
                        <p>Vous faites désormais partie des personnes qui seront informées en priorité pour notre pré-lancement.</p>
                        
                        <p>Nous vous contacterons très bientôt avec les prochaines étapes.</p>
                        
                        <p>À très bientôt,<br><strong>L'équipe NouMatch 🚀</strong></p>
                    </div>
                    <div class="footer">
                        <p>© 2026 NouMatch. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            text_content = f"""Bonjour {entry.first_name or 'Cher futur membre'},

Merci de votre inscription à la liste d'attente de NouMatch.

🚀 Votre position sur la liste : #{entry.position}

Vous faites désormais partie des personnes qui seront informées en priorité pour notre pré-lancement.

Nous vous contacterons très bientôt avec les prochaines étapes.

À très bientôt,
L'équipe NouMatch 🚀
"""
        
        payload = {
            "sender": {
                "name": "NouMatch",
                "email": "no-reply@noumatch.com"
            },
            "to": [
                {
                    "email": entry.email,
                    "name": f"{entry.first_name} {entry.last_name}".strip() or entry.email
                }
            ],
            "subject": subject,
            "htmlContent": html_content,
            "textContent": text_content,
        }
        
        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }
        
        print(f"📧 Envoi d'email de bienvenue à {entry.email}")
        print(f"📧 Position: #{entry.position}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        print(f"📡 Statut: {response.status_code}")
        
        if response.status_code == 201:
            print(f"✅ Email de bienvenue envoyé avec succès à {entry.email}")
            logger.info(f"Waitlist email sent to {entry.email}")
            return True
        else:
            print(f"❌ Erreur API: {response.status_code} - {response.text}")
            logger.error(f"Waitlist email failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        logger.error(f"Waitlist email error: {e}")
        return False



        
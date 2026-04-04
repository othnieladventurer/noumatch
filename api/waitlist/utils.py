# api/waitlist/utils.py
import requests
from django.conf import settings

def send_waitlist_welcome_email(entry):
    """Send full welcome email using Brevo API"""
    api_key = getattr(settings, 'BREVO_API_KEY', None)
    if not api_key:
        print("❌ BREVO_API_KEY missing")
        return False

    url = "https://api.brevo.com/v3/smtp/email"

    # Gender-specific wording
    if entry.gender == 'female':
        members_word = "premières utilisatrices"
        team_emoji = "❤️"
        subject = "✨ Bienvenue sur la liste d'attente NouMatch"
    else:
        members_word = "premiers utilisateurs"
        team_emoji = "🚀"
        subject = "🚀 Bienvenue sur la liste d'attente NouMatch"

    text_content = f"""Bonjour {entry.first_name or ('Chère future membre' if entry.gender == 'female' else 'Cher futur membre')},

Merci de votre inscription à la liste d'attente de NouMatch.

✨ Votre position sur la liste : #{entry.position}

Vous faites désormais partie des personnes qui seront informées en priorité pour notre pré-lancement. NouMatch sera accessible très prochainement, et vous aurez l'opportunité de découvrir la plateforme avant son ouverture au grand public.

Ce que cela signifie pour vous :
✅ Un accès anticipé avant le lancement officiel
✅ Une place parmi les {members_word} de NouMatch
✅ L'opportunité de découvrir l'expérience en avant-première

Vous serez contacté(e) par email dès l'ouverture du pré-lancement afin de créer votre profil et commencer à rencontrer d'autres profils sur la plateforme.

Nous finalisons actuellement les derniers ajustements afin de vous offrir une expérience fluide et de qualité dès l'ouverture.

À très bientôt,

L'équipe NouMatch {team_emoji}
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Bienvenue NouMatch</title>
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
    <div class="header"><h1>{'💖 NouMatch' if entry.gender == 'female' else '🚀 NouMatch'}</h1></div>
    <div class="content">
        <h2>Bonjour {entry.first_name or ('Chère future membre' if entry.gender == 'female' else 'Cher futur membre')} !</h2>
        <p>Merci de votre inscription à la liste d'attente de <strong>NouMatch</strong>.</p>
        <div class="position">
            <p>✨ Votre position sur la liste :</p>
            <div class="position-number">#{entry.position}</div>
        </div>
        <p>Vous faites désormais partie des personnes qui seront informées en priorité pour notre pré-lancement. NouMatch sera accessible très prochainement, et vous aurez l'opportunité de découvrir la plateforme avant son ouverture au grand public.</p>
        <h3>Ce que cela signifie pour vous :</h3>
        <ul>
            <li>✅ Un accès anticipé avant le lancement officiel</li>
            <li>✅ Une place parmi les {members_word} de NouMatch</li>
            <li>✅ L'opportunité de découvrir l'expérience en avant-première</li>
        </ul>
        <p>Vous serez contacté(e) par email dès l'ouverture du pré-lancement afin de créer votre profil et commencer à rencontrer d'autres profils sur la plateforme.</p>
        <p>Nous finalisons actuellement les derniers ajustements afin de vous offrir une expérience fluide et de qualité dès l'ouverture.</p>
        <p>À très bientôt,<br><strong>L'équipe NouMatch {team_emoji}</strong></p>
    </div>
    <div class="footer"><p>© 2026 NouMatch. Tous droits réservés.</p></div>
</div>
</body>
</html>
"""

    payload = {
        "sender": {"name": "NouMatch", "email": "no-reply@noumatch.com"},
        "to": [{"email": entry.email, "name": entry.first_name or entry.email}],
        "subject": subject,
        "textContent": text_content,
        "htmlContent": html_content,
    }
    headers = {"accept": "application/json", "api-key": api_key, "content-type": "application/json"}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 201:
            print(f"✅ Full email sent to {entry.email}")
            return True
        else:
            print(f"❌ API error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False



        
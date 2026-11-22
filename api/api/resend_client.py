"""Resend email API client shared by every outbound email path.

Docs: https://resend.com/docs/api-reference/emails/send-email
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_TIMEOUT_SECONDS = 15
# Resend rejects requests without a User-Agent header (403 / error 1010).
RESEND_USER_AGENT = "NouMatch/1.0"


class ResendError(RuntimeError):
    """Raised when the Resend API rejects a send request."""


def get_api_key():
    return (getattr(settings, "RESEND_API_KEY", "") or "").strip()


def is_configured():
    return bool(get_api_key())


def default_from_email():
    return (
        getattr(settings, "DEFAULT_FROM_EMAIL", "") or "NouMatch <no-reply@noumatch.com>"
    ).strip()


def format_from(address=None, name=""):
    """Build a Resend `from` value: 'Name <email@domain>' or the raw address."""
    sender = (address or default_from_email()).strip()
    if not name or "<" in sender:
        return sender
    return f"{name} <{sender}>"


def _as_address_list(value):
    if not value:
        return []
    if isinstance(value, str):
        return [value]
    return [item for item in value if item]


def send_email(
    *,
    to,
    subject,
    html="",
    text="",
    from_email=None,
    from_name="",
    reply_to=None,
    attachments=None,
    headers=None,
    idempotency_key=None,
):
    """Send one email through Resend and return the API response body.

    Raises ResendError when the API key is missing or Resend rejects the send.
    """
    api_key = get_api_key()
    if not api_key:
        raise ResendError("RESEND_API_KEY is not configured")

    recipients = _as_address_list(to)
    if not recipients:
        raise ResendError("At least one recipient address is required")

    payload = {
        "from": format_from(from_email, from_name),
        "to": recipients,
        "subject": (subject or "").replace("\n", " "),
    }
    if html:
        payload["html"] = html
    if text:
        payload["text"] = text
    if not payload.get("html") and not payload.get("text"):
        payload["text"] = ""

    reply_addresses = _as_address_list(reply_to)
    if reply_addresses:
        payload["reply_to"] = reply_addresses
    if attachments:
        payload["attachments"] = attachments
    if headers:
        payload["headers"] = headers

    request_headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": RESEND_USER_AGENT,
    }
    if idempotency_key:
        request_headers["Idempotency-Key"] = idempotency_key

    try:
        response = requests.post(
            RESEND_API_URL,
            json=payload,
            headers=request_headers,
            timeout=RESEND_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise ResendError(f"Resend request failed: {exc}") from exc

    try:
        response_payload = response.json()
    except ValueError:
        response_payload = {}

    if not 200 <= response.status_code < 300:
        detail = (
            (response_payload.get("message") if isinstance(response_payload, dict) else "")
            or (response_payload.get("error") if isinstance(response_payload, dict) else "")
            or response.text[:300]
            or f"status {response.status_code}"
        )
        raise ResendError(f"Resend send failed ({response.status_code}): {detail}")

    return response_payload if isinstance(response_payload, dict) else {}

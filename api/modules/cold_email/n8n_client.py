# api/modules/cold_email/n8n_client.py
import requests
from .config import settings

def trigger_send_batch(user_id: str, subject: str = None, message: str = None, sender_email: str = None, subdomain: str = None):
    """
    Calls n8n Workflow 1 (Cold Email Automation) webhook synchronously.
    user_id is strictly derived from the verified user session.
    sender_email and subdomain enforce isolated private inbox sending.
    """
    payload = {"user_id": user_id}
    if subject:
        payload["subject"] = subject
        payload["email_subject"] = subject
    if message:
        payload["message"] = message
        payload["content"] = message
        payload["email_body"] = message
        payload["body"] = message
    if sender_email:
        payload["sender_email"] = sender_email
        payload["from_email"] = sender_email
        payload["reply_to"] = sender_email
    if subdomain:
        payload["subdomain"] = subdomain

    auth = None
    if settings.N8N_API_KEY:
        auth = ("n8n", settings.N8N_API_KEY)

    try:
        resp = requests.post(
            f"{settings.N8N_BASE_URL}/send-batch",
            json=payload,
            headers={"x-api-key": settings.N8N_API_KEY},
            auth=auth,
            timeout=30,
        )
        if not resp.ok:
            raise RuntimeError(f"n8n returned HTTP {resp.status_code}: {resp.text.strip()}")
        try:
            return resp.json()
        except Exception:
            return {"status": "ok", "raw": resp.text}
    except requests.RequestException as e:
        raise RuntimeError(f"Connection to n8n webhook failed: {e}")


def trigger_send_reply(user_id: str, lead_id: str, lead_email: str, subject: str, message: str, sender_email: str = None, subdomain: str = None):
    """
    Calls n8n Workflow 3 (Manual Reply) webhook synchronously.
    user_id is injected strictly from the server-side session.
    sender_email and subdomain enforce isolated private inbox sending.
    """
    payload = {
        "user_id": user_id,
        "lead_id": lead_id,
        "lead_email": lead_email,
        "subject": subject,
        "message": message
    }
    if sender_email:
        payload["sender_email"] = sender_email
        payload["from_email"] = sender_email
        payload["reply_to"] = sender_email
    if subdomain:
        payload["subdomain"] = subdomain

    auth = None
    if settings.N8N_API_KEY:
        auth = ("n8n", settings.N8N_API_KEY)

    try:
        resp = requests.post(
            f"{settings.N8N_BASE_URL}/send-reply",
            json=payload,
            headers={"x-api-key": settings.N8N_API_KEY},
            auth=auth,
            timeout=25,
        )
        if not resp.ok:
            raise RuntimeError(f"n8n returned HTTP {resp.status_code}: {resp.text.strip()}")
        try:
            return resp.json()
        except Exception:
            return {"status": "ok", "raw": resp.text}
    except requests.RequestException as e:
        raise RuntimeError(f"Connection to n8n webhook failed: {e}")

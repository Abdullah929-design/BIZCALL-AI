# api/modules/cold_email/n8n_client.py
import httpx
from .config import settings

async def trigger_send_batch(user_id: str, subject: str = None, message: str = None, sender_email: str = None, subdomain: str = None):
    """
    Calls n8n Workflow 1 (Cold Email Automation) webhook.
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
        # Pass basic auth as well if n8n webhook requires basic auth
        auth = ("n8n", settings.N8N_API_KEY)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.N8N_BASE_URL}/send-batch",
            json=payload,
            headers={"x-api-key": settings.N8N_API_KEY},
            auth=auth,
            timeout=25,
        )
        if resp.is_error:
            raise RuntimeError(f"n8n returned HTTP {resp.status_code}: {resp.text.strip()}")
        try:
            return resp.json()
        except Exception:
            return {"status": "ok", "raw": resp.text}


async def trigger_send_reply(user_id: str, lead_id: str, lead_email: str, subject: str, message: str, sender_email: str = None, subdomain: str = None):
    """
    Calls n8n Workflow 3 (Manual Reply) webhook.
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

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.N8N_BASE_URL}/send-reply",
            json=payload,
            headers={"x-api-key": settings.N8N_API_KEY},
            auth=auth,
            timeout=20,
        )
        if resp.is_error:
            raise RuntimeError(f"n8n returned HTTP {resp.status_code}: {resp.text.strip()}")
        try:
            return resp.json()
        except Exception:
            return {"status": "ok", "raw": resp.text}


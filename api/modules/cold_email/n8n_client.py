# api/modules/cold_email/n8n_client.py
import httpx
from .config import settings

async def trigger_send_batch(user_id: str):
    """
    Calls n8n Workflow 1 (Cold Email Automation) webhook.
    user_id is strictly derived from the verified user session.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.N8N_BASE_URL}/send-batch",
            json={"user_id": user_id},
            headers={"x-api-key": settings.N8N_API_KEY},
            timeout=20,
        )
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception:
            return {"status": "ok", "raw": resp.text}


# Append this function to api/modules/cold_email/n8n_client.py

async def trigger_send_reply(user_id: str, lead_id: str, lead_email: str, subject: str, message: str):
    """
    Calls n8n Workflow 3 (Manual Reply) webhook.
    user_id is injected strictly from the server-side session.
    """
    payload = {
        "user_id": user_id,
        "lead_id": lead_id,
        "lead_email": lead_email,
        "subject": subject,
        "message": message
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.N8N_BASE_URL}/send-reply",
            json=payload,
            headers={"x-api-key": settings.N8N_API_KEY},
            timeout=20,
        )
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception:
            return {"status": "ok", "raw": resp.text}

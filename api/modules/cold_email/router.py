import csv
import io
from starlette.concurrency import run_in_threadpool
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from .auth import get_current_user, AuthenticatedUser
from . import n8n_client, sheets_client, gmail_service
from .schemas import SendReplyRequest, CreateLeadRequest, UpdateLeadRequest, SendBatchRequest, GmailConnectRequest
from typing import List, Optional

import time
from typing import Dict

router = APIRouter()

# In-memory tracking for server-side debounce / rate limiting (one active batch per user every 15s)
_last_batch_trigger: Dict[str, float] = {}


@router.post("/leads/bulk-csv")
async def import_leads_csv(file: UploadFile = File(...), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Imports leads in bulk from a CSV file.
    Validates headers and appends all rows directly to Google Sheets with user.id strictly injected.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .csv file.")

    try:
        content = await file.read()
        decoded = content.decode("utf-8-sig")  # handles potential UTF-8 BOM
        reader = csv.DictReader(io.StringIO(decoded))
        
        leads_to_add = []
        for row in reader:
            cleaned_row = {str(k).strip().lower(): str(v).strip() for k, v in row.items() if k}
            email = cleaned_row.get("email", "")
            if not email:
                continue
            leads_to_add.append(cleaned_row)

        if not leads_to_add:
            raise HTTPException(status_code=400, detail="No valid lead rows with an 'email' column found in CSV.")

        result = await run_in_threadpool(sheets_client.bulk_add_leads_for_user, user_id=user.id, leads_data=leads_to_add)
        return {"success": True, "count": result.get("count", 0), "message": f"Successfully imported {result.get('count', 0)} leads."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")


@router.post("/leads")
def create_lead(payload: CreateLeadRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """Appends a new lead directly to Google Sheets with user.id stamped."""
    try:
        result = sheets_client.add_lead_for_user(user_id=user.id, data=payload.dict())
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add lead to Google Sheets: {str(e)}")


@router.put("/leads/{row_number}")
def update_lead(row_number: int, payload: UpdateLeadRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """Updates an existing lead in Google Sheets after verifying user ownership."""
    try:
        clean_data = {k: v for k, v in payload.dict().items() if v is not None and k != "row_number"}
        result = sheets_client.update_lead_for_user(user_id=user.id, row_number=row_number, data=clean_data)
        return {"success": True, "data": result}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update lead: {str(e)}")


@router.delete("/leads/{row_number}")
def delete_lead(row_number: int, user: AuthenticatedUser = Depends(get_current_user)):
    """Deletes a lead row in Google Sheets after verifying user ownership."""
    try:
        result = sheets_client.delete_lead_for_user(user_id=user.id, row_number=row_number)
        return {"success": True, "data": result}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete lead: {str(e)}")


@router.post("/send-batch")
def send_batch(
    background_tasks: BackgroundTasks,
    payload: Optional[SendBatchRequest] = None,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Triggers outbound batch email processing for the authenticated user.
    Supports 'managed' (n8n + Brevo) and 'gmail_smtp' (Personal Gmail SMTP).
    Enforces server-side 15s debounce across both modes.
    """
    now = time.time()
    last_run = _last_batch_trigger.get(user.id, 0)
    cooldown_period = 15  # seconds

    if (now - last_run) < cooldown_period:
        remaining = int(cooldown_period - (now - last_run))
        raise HTTPException(
            status_code=429,
            detail=f"A batch send is already running. Please wait {remaining} seconds before starting another batch."
        )

    _last_batch_trigger[user.id] = now

    channel = (payload.channel or "managed").strip().lower() if payload else "managed"
    subject = payload.subject.strip() if (payload and payload.subject) else None
    message = (payload.message or payload.content or "").strip() if payload else None
    if not message:
        message = None

    # If custom campaign content provided, persist on pending leads in Google Sheets
    if subject or message:
        sheets_client.set_campaign_content_for_pending_leads(user_id=user.id, subject=subject, message=message)

    # Branch 1: Personal Gmail SMTP Mode
    if channel == "gmail_smtp":
        conn = gmail_service.get_gmail_connection(user.id, include_secret=False)
        if not conn:
            _last_batch_trigger.pop(user.id, None)
            raise HTTPException(status_code=400, detail="Personal Gmail is not connected. Please connect your Gmail first.")

        background_tasks.add_task(gmail_service.send_gmail_batch, user.id, subject, message)
        sheets_client.invalidate_tab_cache("Leads")
        return {
            "status": "started",
            "channel": "gmail_smtp",
            "sender_inbox": conn["gmail_address"],
            "n8n_response": {"mode": "personal_gmail_smtp"},
        }

    # Branch 2: Managed Pipeline (n8n + Brevo) — completely untouched
    sender_email = None
    subdomain = None
    try:
        from routers.company import get_or_create_tenant_subdomain
        sub_info = get_or_create_tenant_subdomain(user.id)
        sender_email = sub_info.get("inbox_email")
        subdomain = sub_info.get("subdomain")
    except Exception as ex:
        print(f"[cold_email] Failed to resolve tenant subdomain: {ex}")

    try:
        result = n8n_client.trigger_send_batch(
            user_id=user.id,
            subject=subject,
            message=message,
            sender_email=sender_email,
            subdomain=subdomain
        )
        sheets_client.invalidate_tab_cache("Leads")
        return {"status": "started", "channel": "managed", "n8n_response": result, "sender_inbox": sender_email, "subdomain": subdomain}
    except Exception as e:
        _last_batch_trigger.pop(user.id, None)
        raise HTTPException(status_code=502, detail=f"Failed to trigger n8n batch workflow: {str(e)}")


@router.get("/bundle")
def get_dashboard_bundle(force: bool = False, channel: str = "managed", user: AuthenticatedUser = Depends(get_current_user)):
    """
    Fetches CRM dashboard tabs in a single round-trip.
    - 'leads' is ALWAYS shared from Google Sheets across both modes.
    - 'hot_leads', 'neutral_leads', 'failed_leads' are strictly isolated by channel:
        * managed    -> Google Sheets (n8n + Brevo)
        * gmail_smtp -> Supabase gmail_crm_replies (Personal Gmail IMAP + Groq)
    """
    try:
        ch = (channel or "managed").strip().lower()
        if ch == "gmail_smtp":
            if force:
                sheets_client.invalidate_tab_cache("Leads")
            shared_leads = sheets_client.get_leads_for_user(user_id=user.id)
            gmail_queues = gmail_service.fetch_gmail_replies_bundle(user_id=user.id)
            return {
                "success": True,
                "channel": "gmail_smtp",
                "data": {
                    "leads": shared_leads,
                    "hot_leads": gmail_queues["hot_leads"],
                    "neutral_leads": gmail_queues["neutral_leads"],
                    "failed_leads": gmail_queues["failed_leads"],
                },
            }

        data = sheets_client.fetch_dashboard_bundle(user_id=user.id, force=force)
        return {"success": True, "channel": "managed", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dashboard bundle: {str(e)}")


@router.get("/leads")
def get_leads(status: str = None, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Fetches leads from the 'Leads' tab for the authenticated user.
    Optional query param ?status=... filters by status.
    user_id is strictly derived from session.
    """
    try:
        leads = sheets_client.get_leads_for_user(user_id=user.id, status=status)
        return {"success": True, "data": leads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading Leads sheet: {str(e)}")


@router.get("/hot-leads")
def get_hot_leads(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Fetches hot leads (positive replies) for the authenticated user.
    Returns reply_summary, draft_reply, confidence, gmail_thread_id, human_action, actioned_at.
    """
    try:
        leads = sheets_client.get_hot_leads_for_user(user_id=user.id)
        return {"success": True, "data": leads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading Hot Leads sheet: {str(e)}")


@router.get("/neutral-leads")
@router.get("/neutral-queue")
def get_neutral_leads(user: AuthenticatedUser = Depends(get_current_user)):
    """Fetches neutral queue leads requiring manual inspection for the authenticated user."""
    try:
        leads = sheets_client.get_neutral_leads_for_user(user_id=user.id)
        return {"success": True, "data": leads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading Neutral Queue sheet: {str(e)}")


@router.get("/failed-leads")
def get_failed_leads(user: AuthenticatedUser = Depends(get_current_user)):
    """Fetches bounced or failed leads for the authenticated user (read-only)."""
    try:
        leads = sheets_client.get_failed_leads_for_user(user_id=user.id)
        return {"success": True, "data": leads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading Failed Leads sheet: {str(e)}")

@router.get("/analytics")
def get_analytics(user: AuthenticatedUser = Depends(get_current_user)):
    """Fetches aggregate analytics and stats for the authenticated user."""
    try:
        data = sheets_client.fetch_tab_rows(tab_name="Analytics", user_id=user.id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading Analytics sheet: {str(e)}")


@router.post("/send-reply")
def send_reply(payload: SendReplyRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Sends a manual reply to a HOT/NEUTRAL lead.
    Routes strictly by channel:
    - 'gmail_smtp': sends via Personal Gmail SMTP with In-Reply-To threading.
    - 'managed': sends via n8n Workflow 3 + Brevo (untouched).
    """
    ch = (payload.channel or "managed").strip().lower()
    if ch == "gmail_smtp":
        try:
            result = gmail_service.send_gmail_reply(
                user_id=user.id,
                lead_id=payload.lead_id,
                lead_email=payload.lead_email,
                subject=payload.subject,
                message_text=payload.message,
            )
            return {"status": "sent", "channel": "gmail_smtp", "sender_inbox": result.get("sender"), "result": result}
        except PermissionError as pe:
            raise HTTPException(status_code=403, detail=str(pe))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to send reply via Personal Gmail: {str(e)}")

    # Defense-in-depth: check that lead belongs to user
    try:
        user_hot_leads = sheets_client.get_hot_leads_for_user(user_id=user.id)
        user_neutral_leads = sheets_client.get_neutral_leads_for_user(user_id=user.id)
        candidate_leads = user_hot_leads + user_neutral_leads
        valid_lead = next(
            (l for l in candidate_leads if str(l.get("lead_id", "")).strip() == payload.lead_id.strip() or str(l.get("email", "")).strip().lower() == payload.lead_email.strip().lower()),
            None
        )
        if not valid_lead and candidate_leads:
            raise HTTPException(status_code=403, detail="Unauthorized: Lead does not belong to your account")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[WARN] Leads defense check skipped: {e}")

    sender_email = None
    subdomain = None
    try:
        from routers.company import get_or_create_tenant_subdomain
        sub_info = get_or_create_tenant_subdomain(user.id)
        sender_email = sub_info.get("inbox_email")
        subdomain = sub_info.get("subdomain")
    except Exception as ex:
        print(f"[cold_email] Failed to resolve tenant subdomain for reply: {ex}")

    try:
        result = n8n_client.trigger_send_reply(
            user_id=user.id,
            lead_id=payload.lead_id,
            lead_email=payload.lead_email,
            subject=payload.subject,
            message=payload.message,
            sender_email=sender_email,
            subdomain=subdomain
        )
        sheets_client.mark_lead_replied(user_id=user.id, lead_id=payload.lead_id, lead_email=payload.lead_email)
        return {"status": "sent", "channel": "managed", "n8n_response": result, "sender_inbox": sender_email, "subdomain": subdomain}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send reply via n8n: {str(e)}")


# ---------------------------------------------------------------------------
# Personal Gmail (SMTP / IMAP) Connection & Sync Endpoints
# ---------------------------------------------------------------------------

@router.get("/gmail/status")
def get_gmail_status(user: AuthenticatedUser = Depends(get_current_user)):
    conn = gmail_service.get_gmail_connection(user.id, include_secret=False)
    if not conn:
        return {"connected": False, "gmail_address": None, "last_synced_at": None}
    return {
        "connected": True,
        "gmail_address": conn["gmail_address"],
        "last_synced_at": conn.get("last_synced_at"),
    }


@router.post("/gmail/connect")
def connect_gmail(payload: GmailConnectRequest, user: AuthenticatedUser = Depends(get_current_user)):
    try:
        res = gmail_service.save_gmail_connection(
            user_id=user.id,
            gmail_address=payload.gmail_address,
            app_password=payload.app_password,
        )
        return {"success": True, **res}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect Gmail: {str(e)}")


@router.delete("/gmail/disconnect")
def disconnect_gmail(user: AuthenticatedUser = Depends(get_current_user)):
    try:
        gmail_service.disconnect_gmail_connection(user.id)
        return {"success": True, "connected": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disconnect Gmail: {str(e)}")


@router.post("/gmail/sync")
def sync_gmail_inbox(user: AuthenticatedUser = Depends(get_current_user)):
    try:
        res = gmail_service.sync_gmail_inbox_for_user(user.id)
        return {"success": True, **res}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to sync Gmail inbox: {str(e)}")
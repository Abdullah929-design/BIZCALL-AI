import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from .auth import get_current_user, AuthenticatedUser
from . import n8n_client, sheets_client
from .schemas import SendReplyRequest, CreateLeadRequest, UpdateLeadRequest
from typing import List

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

        result = sheets_client.bulk_add_leads_for_user(user_id=user.id, leads_data=leads_to_add)
        return {"success": True, "count": result.get("count", 0), "message": f"Successfully imported {result.get('count', 0)} leads."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")


@router.post("/leads")
async def create_lead(payload: CreateLeadRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """Appends a new lead directly to Google Sheets with user.id stamped."""
    try:
        result = sheets_client.add_lead_for_user(user_id=user.id, data=payload.dict())
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add lead to Google Sheets: {str(e)}")


@router.put("/leads/{row_number}")
async def update_lead(row_number: int, payload: UpdateLeadRequest, user: AuthenticatedUser = Depends(get_current_user)):
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
async def delete_lead(row_number: int, user: AuthenticatedUser = Depends(get_current_user)):
    """Deletes a lead row in Google Sheets after verifying user ownership."""
    try:
        result = sheets_client.delete_lead_for_user(user_id=user.id, row_number=row_number)
        return {"success": True, "data": result}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete lead: {str(e)}")


@router.post("/send-batch")
async def send_batch(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Triggers n8n batch email processing for the authenticated user.
    Enforces server-side debounce to prevent duplicate batch triggers.
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

    try:
        result = await n8n_client.trigger_send_batch(user_id=user.id)
        return {"status": "started", "n8n_response": result}
    except Exception as e:
        # Reset on failure so the user can retry
        _last_batch_trigger.pop(user.id, None)
        raise HTTPException(status_code=502, detail=f"Failed to trigger n8n batch workflow: {str(e)}")


@router.get("/leads")
async def get_leads(status: str = None, user: AuthenticatedUser = Depends(get_current_user)):
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
async def get_hot_leads(user: AuthenticatedUser = Depends(get_current_user)):
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
async def get_neutral_leads(user: AuthenticatedUser = Depends(get_current_user)):
    """Fetches neutral queue leads requiring manual inspection for the authenticated user."""
    try:
        leads = sheets_client.get_neutral_leads_for_user(user_id=user.id)
        return {"success": True, "data": leads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading Neutral Queue sheet: {str(e)}")


@router.get("/failed-leads")
async def get_failed_leads(user: AuthenticatedUser = Depends(get_current_user)):
    """Fetches bounced or failed leads for the authenticated user (read-only)."""
    try:
        leads = sheets_client.get_failed_leads_for_user(user_id=user.id)
        return {"success": True, "data": leads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading Failed Leads sheet: {str(e)}")

@router.get("/analytics")
async def get_analytics(user: AuthenticatedUser = Depends(get_current_user)):
    """Fetches aggregate analytics and stats for the authenticated user."""
    try:
        data = sheets_client.fetch_tab_rows(tab_name="Analytics", user_id=user.id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading Analytics sheet: {str(e)}")


@router.post("/send-reply")
async def send_reply(payload: SendReplyRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Sends a manual reply to a HOT lead via n8n Workflow 3.
    user_id is injected server-side from user.id.
    """
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
        # Non-fatal defense check logging
        print(f"[WARN] Leads defense check skipped: {e}")
    try:
        result = await n8n_client.trigger_send_reply(
            user_id=user.id,
            lead_id=payload.lead_id,
            lead_email=payload.lead_email,
            subject=payload.subject,
            message=payload.message,
        )
        # Immediately stamp the status='replied' in Google Sheets so UI reflects it
        sheets_client.mark_lead_replied(user_id=user.id, lead_id=payload.lead_id, lead_email=payload.lead_email)
        return {"status": "sent", "n8n_response": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send reply via n8n: {str(e)}")
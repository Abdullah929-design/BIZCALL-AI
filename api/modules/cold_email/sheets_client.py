# api/modules/cold_email/sheets_client.py
import os
from typing import List, Dict, Any
from google.oauth2 import service_account  # type: ignore
from googleapiclient.discovery import build  # type: ignore
from .config import settings

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

def add_lead_for_user(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Appends a new lead row to the 'Leads' tab.
    user_id is strictly injected server-side.
    """
    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    
    # Get header row to match exact column order
    header_res = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range="'Leads'!A1:Z1"
    ).execute()
    headers = [str(h).strip().lower() for h in (header_res.get("values", [[]])[0])]
    if not headers:
        headers = ["id", "first_name", "last_name", "email", "company", "title", "industry", "notes", "status", "sent_at", "replied_at", "email_subject", "email_body", "error_note", "user_id"]
    import uuid
    lead_id = data.get("id") or f"lead_{uuid.uuid4().hex[:8]}"
    
    # Split name if needed
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    if not first_name and data.get("name"):
        parts = data["name"].strip().split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""
    row_data_map = {
        "id": lead_id,
        "first_name": first_name,
        "last_name": last_name,
        "name": data.get("name") or f"{first_name} {last_name}".strip(),
        "email": data.get("email", "").strip(),
        "company": data.get("company", "").strip(),
        "title": data.get("title", "").strip(),
        "industry": data.get("industry", "").strip(),
        "notes": data.get("notes", "").strip(),
        "status": data.get("status", "pending").strip(),
        "sent_at": data.get("sent_at", ""),
        "replied_at": data.get("replied_at", ""),
        "email_subject": data.get("email_subject", ""),
        "email_body": data.get("email_body", ""),
        "error_note": "",
        "user_id": user_id  # strictly injected
    }
    new_row = [str(row_data_map.get(col, "")) for col in headers]
    service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range="'Leads'!A:Z",
        valueInputOption="USER_ENTERED",
        body={"values": [new_row]}
    ).execute()
    return {"success": True, "lead_id": lead_id}

def bulk_add_leads_for_user(user_id: str, leads_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Appends a batch of lead rows to the 'Leads' tab in a single Google Sheets call.
    user_id is strictly injected server-side for every single row.
    """
    if not leads_data:
        return {"success": True, "count": 0}

    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    
    header_res = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range="'Leads'!A1:Z1"
    ).execute()
    headers = [str(h).strip().lower() for h in (header_res.get("values", [[]])[0])]
    if not headers:
        headers = ["id", "first_name", "last_name", "email", "company", "title", "industry", "notes", "status", "sent_at", "replied_at", "email_subject", "email_body", "error_note", "user_id"]

    import uuid
    rows_to_append = []

    for item in leads_data:
        lead_id = item.get("id") or f"lead_{uuid.uuid4().hex[:8]}"
        first_name = item.get("first_name", "")
        last_name = item.get("last_name", "")
        if not first_name and item.get("name"):
            parts = item["name"].strip().split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""

        row_data_map = {
            "id": lead_id,
            "first_name": first_name,
            "last_name": last_name,
            "name": item.get("name") or f"{first_name} {last_name}".strip(),
            "email": item.get("email", "").strip(),
            "company": item.get("company", "").strip(),
            "title": item.get("title", "").strip(),
            "industry": item.get("industry", "").strip(),
            "notes": item.get("notes", "").strip(),
            "status": item.get("status", "pending").strip() or "pending",
            "sent_at": item.get("sent_at", ""),
            "replied_at": item.get("replied_at", ""),
            "email_subject": item.get("email_subject", ""),
            "email_body": item.get("email_body", ""),
            "error_note": "",
            "user_id": user_id  # strictly injected
        }

        row = [str(row_data_map.get(col, "")) for col in headers]
        rows_to_append.append(row)

    service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range="'Leads'!A:Z",
        valueInputOption="USER_ENTERED",
        body={"values": rows_to_append}
    ).execute()

    return {"success": True, "count": len(rows_to_append)}
def update_lead_for_user(user_id: str, row_number: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Updates an existing lead row.
    Validates that row_number belongs strictly to user_id before writing.
    """
    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    # 1. Read the specific row to verify tenancy
    row_range = f"'Leads'!A{row_number}:Z{row_number}"
    current = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=row_range
    ).execute()
    vals = current.get("values", [[]])[0] if current.get("values") else []
    
    # Read headers
    header_res = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range="'Leads'!A1:Z1"
    ).execute()
    headers = [str(h).strip().lower() for h in (header_res.get("values", [[]])[0])]
    try:
        user_id_idx = headers.index("user_id")
        row_user_id = vals[user_id_idx].strip() if len(vals) > user_id_idx else ""
    except ValueError:
        row_user_id = ""
    if row_user_id != user_id:
        raise PermissionError("Unauthorized: This row does not belong to your account")
    # Update allowed fields
    updated_vals = list(vals)
    while len(updated_vals) < len(headers):
        updated_vals.append("")
    for k, v in data.items():
        lk = k.strip().lower()
        if lk in headers and lk != "user_id":  # Never allow changing user_id
            updated_vals[headers.index(lk)] = str(v)
    # If first_name / last_name updated from name
    if "name" in data and "first_name" in headers:
        parts = data["name"].strip().split(" ", 1)
        updated_vals[headers.index("first_name")] = parts[0]
        if "last_name" in headers and len(parts) > 1:
            updated_vals[headers.index("last_name")] = parts[1]
    service.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=row_range,
        valueInputOption="USER_ENTERED",
        body={"values": [updated_vals]}
    ).execute()
    return {"success": True}
def delete_lead_for_user(user_id: str, row_number: int) -> Dict[str, Any]:
    """
    Deletes a lead row in Google Sheets after verifying user_id tenancy.
    """
    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    # 1. Tenancy check
    row_range = f"'Leads'!A{row_number}:Z{row_number}"
    current = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=row_range
    ).execute()
    vals = current.get("values", [[]])[0] if current.get("values") else []
    header_res = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range="'Leads'!A1:Z1"
    ).execute()
    headers = [str(h).strip().lower() for h in (header_res.get("values", [[]])[0])]
    try:
        user_id_idx = headers.index("user_id")
        row_user_id = vals[user_id_idx].strip() if len(vals) > user_id_idx else ""
    except ValueError:
        row_user_id = ""
    if row_user_id != user_id:
        raise PermissionError("Unauthorized: This row does not belong to your account")
    # Get sheetId for 'Leads' tab
    sheet_metadata = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
    leads_sheet_id = 0
    for s in sheet_metadata.get("sheets", []):
        if s.get("properties", {}).get("title") == "Leads":
            leads_sheet_id = s["properties"]["sheetId"]
            break
    # Delete the row dimension (0-indexed: row_number - 1)
    body = {
        "requests": [
            {
                "deleteDimension": {
                    "range": {
                        "sheetId": leads_sheet_id,
                        "dimension": "ROWS",
                        "startIndex": row_number - 1,
                        "endIndex": row_number
                    }
                }
            }
        ]
    }
    service.spreadsheets().batchUpdate(spreadsheetId=sheet_id, body=body).execute()
    return {"success": True}


def get_sheets_service():
    """Builds a read-only Google Sheets API client from the service account JSON."""
    json_path = settings.GOOGLE_SERVICE_ACCOUNT_JSON
    
    # Check fallback for potential Windows double-extension (.json.json)
    if not os.path.exists(json_path) and os.path.exists(json_path + ".json"):
        json_path = json_path + ".json"

    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Service account file not found at: {json_path}")

    creds = service_account.Credentials.from_service_account_file(json_path, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds, cache_discovery=False)


def fetch_tab_rows(tab_name: str, user_id: str, status: str = None) -> List[Dict[str, Any]]:
    """
    Reads all rows from a tab in 'Email Automation CRM' sheet and filters strictly by user_id.
    Never returns rows belonging to any other user.
    """
    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    
    range_name = f"'{tab_name}'!A1:Z"
    result = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=range_name
    ).execute()

    values = result.get("values", [])
    if not values or len(values) < 2:
        return []

    headers = [str(h).strip().lower() for h in values[0]]
    
    try:
        user_id_idx = headers.index("user_id")
    except ValueError:
        user_id_idx = -1

    try:
        status_idx = headers.index("status")
    except ValueError:
        status_idx = -1

    records: List[Dict[str, Any]] = []
    
    for i, row in enumerate(values[1:], start=2):
        # Enforce tenancy: user_id must match
        if user_id_idx != -1:
            row_user_id = row[user_id_idx].strip() if len(row) > user_id_idx else ""
            if row_user_id != user_id:
                continue
        
        # Optional status filter
        if status and status_idx != -1:
            row_status = row[status_idx].strip().lower() if len(row) > status_idx else ""
            if row_status != status.strip().lower():
                continue
        
        row_dict: Dict[str, Any] = {"_row_number": i}
        for col_idx, header in enumerate(headers):
            val = row[col_idx].strip() if col_idx < len(row) else ""
            row_dict[header] = val
        
        # Combine first_name and last_name into name if name is empty
        if not row_dict.get("name"):
            first = row_dict.get("first_name", "")
            last = row_dict.get("last_name", "")
            full = f"{first} {last}".strip()
            if full:
                row_dict["name"] = full
        
        records.append(row_dict)

    return records


def get_leads_for_user(user_id: str, status: str = None) -> List[Dict[str, Any]]:
    """Helper method to fetch tenancy-filtered leads from the 'Leads' tab."""
    return fetch_tab_rows(tab_name="Leads", user_id=user_id, status=status)

def get_hot_leads_for_user(user_id: str) -> List[Dict[str, Any]]:
    """
    Fetches Hot Leads tab for user_id.
    Includes reply_summary, draft_reply, confidence, gmail_thread_id, human_action, actioned_at.
    """
    return fetch_tab_rows(tab_name="Hot Leads", user_id=user_id)

def get_neutral_leads_for_user(user_id: str) -> List[Dict[str, Any]]:
    """Fetches Neutral Queue tab for user_id."""
    return fetch_tab_rows(tab_name="Neutral Queue", user_id=user_id)

def get_failed_leads_for_user(user_id: str) -> List[Dict[str, Any]]:
    """Fetches Failed Leads tab for user_id (read-only)."""
    return fetch_tab_rows(tab_name="Failed Leads", user_id=user_id)


def mark_lead_replied(user_id: str, lead_id: str = None, lead_email: str = None):
    """
    Finds matching lead rows in 'Hot Leads' and 'Neutral Queue' tabs for user_id,
    and updates status='replied' (and actioned_at/human_action if column exists).
    """
    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    import datetime
    now_iso = datetime.datetime.now().astimezone().isoformat()

    for tab_name in ["Neutral Queue", "Hot Leads"]:
        try:
            res = service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=f"'{tab_name}'!A1:Z"
            ).execute()
            values = res.get("values", [])
            if not values or len(values) < 2:
                continue

            headers = [str(h).strip().lower() for h in values[0]]
            user_id_idx = headers.index("user_id") if "user_id" in headers else -1
            lead_id_idx = headers.index("lead_id") if "lead_id" in headers else -1
            email_idx = headers.index("email") if "email" in headers else -1
            status_idx = headers.index("status") if "status" in headers else -1
            human_action_idx = headers.index("human_action") if "human_action" in headers else -1
            actioned_at_idx = headers.index("actioned_at") if "actioned_at" in headers else -1

            for row_idx, row in enumerate(values[1:], start=2):
                if user_id_idx != -1:
                    row_uid = row[user_id_idx].strip() if len(row) > user_id_idx else ""
                    if row_uid != user_id:
                        continue

                row_lid = row[lead_id_idx].strip() if (lead_id_idx != -1 and len(row) > lead_id_idx) else ""
                row_email = row[email_idx].strip().lower() if (email_idx != -1 and len(row) > email_idx) else ""

                matched = False
                if lead_id and row_lid and lead_id.strip() == row_lid:
                    matched = True
                elif lead_email and row_email and lead_email.strip().lower() == row_email:
                    matched = True

                if matched:
                    if status_idx != -1:
                        col_letter = chr(ord('A') + status_idx)
                        service.spreadsheets().values().update(
                            spreadsheetId=sheet_id,
                            range=f"'{tab_name}'!{col_letter}{row_idx}",
                            valueInputOption="USER_ENTERED",
                            body={"values": [["replied"]]}
                        ).execute()

                    if human_action_idx != -1:
                        col_letter = chr(ord('A') + human_action_idx)
                        service.spreadsheets().values().update(
                            spreadsheetId=sheet_id,
                            range=f"'{tab_name}'!{col_letter}{row_idx}",
                            valueInputOption="USER_ENTERED",
                            body={"values": [["replied"]]}
                        ).execute()

                    if actioned_at_idx != -1:
                        col_letter = chr(ord('A') + actioned_at_idx)
                        service.spreadsheets().values().update(
                            spreadsheetId=sheet_id,
                            range=f"'{tab_name}'!{col_letter}{row_idx}",
                            valueInputOption="USER_ENTERED",
                            body={"values": [[now_iso]]}
                        ).execute()
        except Exception as e:
            print(f"[WARN] Error marking lead replied in {tab_name}: {e}")


def set_campaign_content_for_pending_leads(user_id: str, subject: str = None, message: str = None):
    """
    Sets email_subject and email_body on all 'pending' rows belonging to user_id in the Leads tab.
    """
    if not subject and not message:
        return
    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    try:
        res = service.spreadsheets().values().get(
            spreadsheetId=sheet_id,
            range="'Leads'!A1:Z"
        ).execute()
        values = res.get("values", [])
        if not values or len(values) < 2:
            return
        headers = [str(h).strip().lower() for h in values[0]]
        user_id_idx = headers.index("user_id") if "user_id" in headers else -1
        status_idx = headers.index("status") if "status" in headers else -1
        subj_idx = headers.index("email_subject") if "email_subject" in headers else -1
        body_idx = headers.index("email_body") if "email_body" in headers else -1

        updates = []
        for row_idx, row in enumerate(values[1:], start=2):
            if user_id_idx != -1:
                row_uid = row[user_id_idx].strip() if len(row) > user_id_idx else ""
                if row_uid != user_id:
                    continue
            if status_idx != -1:
                row_status = row[status_idx].strip().lower() if len(row) > status_idx else ""
                if row_status != "pending":
                    continue

            if subj_idx != -1 and subject:
                col_letter = chr(ord('A') + subj_idx)
                updates.append({
                    "range": f"'Leads'!{col_letter}{row_idx}",
                    "values": [[subject]]
                })
            if body_idx != -1 and message:
                col_letter = chr(ord('A') + body_idx)
                updates.append({
                    "range": f"'Leads'!{col_letter}{row_idx}",
                    "values": [[message]]
                })

        if updates:
            service.spreadsheets().values().batchUpdate(
                spreadsheetId=sheet_id,
                body={"valueInputOption": "USER_ENTERED", "data": updates}
            ).execute()
    except Exception as e:
        print(f"[WARN] Failed to set campaign content for pending leads: {e}")



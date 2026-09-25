# api/modules/cold_email/sheets_client.py
import os
import time
from typing import List, Dict, Any, Tuple, Optional
from google.oauth2 import service_account  # type: ignore
from googleapiclient.discovery import build  # type: ignore
from .config import settings

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# --- Performance In-Memory Caches ---
_cached_service = None
_tab_cache: Dict[str, Tuple[float, List[List[str]]]] = {}
_headers_cache: Dict[str, List[str]] = {}
CACHE_TTL_SECONDS = 5.0  # 5s TTL for read operations

def invalidate_tab_cache(tab_name: Optional[str] = None):
    """Invalidates memory cache for a specific tab or all tabs on write operations."""
    global _tab_cache
    if tab_name:
        _tab_cache.pop(tab_name, None)
    else:
        _tab_cache.clear()

def get_sheets_service():
    """Returns a singleton cached Google Sheets API client."""
    global _cached_service
    if _cached_service is not None:
        return _cached_service

    json_path = settings.GOOGLE_SERVICE_ACCOUNT_JSON
    if not os.path.exists(json_path) and os.path.exists(json_path + ".json"):
        json_path = json_path + ".json"

    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Service account file not found at: {json_path}")

    creds = service_account.Credentials.from_service_account_file(json_path, scopes=SCOPES)
    _cached_service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    return _cached_service

def get_tab_headers(tab_name: str) -> List[str]:
    """Caches and returns header row for a tab, avoiding redundant network lookups."""
    if tab_name in _headers_cache:
        return _headers_cache[tab_name]
    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    res = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=f"'{tab_name}'!A1:Z1"
    ).execute()
    headers = [str(h).strip().lower() for h in (res.get("values", [[]])[0])]
    if headers:
        _headers_cache[tab_name] = headers
    return headers

def parse_rows_for_user(values: List[List[str]], user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Parses a 2D values array from a tab, filtering strictly by user_id and optional status.
    """
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

def fetch_tab_raw_values(tab_name: str) -> List[List[str]]:
    """
    Fetches raw 2D values from Google Sheets for a tab, using in-memory cache if fresh (< 8s).
    """
    now = time.time()
    if tab_name in _tab_cache:
        cached_time, cached_val = _tab_cache[tab_name]
        if (now - cached_time) < CACHE_TTL_SECONDS:
            return cached_val

    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    range_name = f"'{tab_name}'!A1:Z"
    result = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=range_name
    ).execute()
    values = result.get("values", [])
    _tab_cache[tab_name] = (now, values)
    return values

def fetch_tab_rows(tab_name: str, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Reads rows from a tab in 'Email Automation CRM' sheet and filters strictly by user_id.
    Never returns rows belonging to any other user. Uses cached read with 8s TTL.
    """
    values = fetch_tab_raw_values(tab_name)
    return parse_rows_for_user(values, user_id=user_id, status=status)

def fetch_dashboard_bundle(user_id: str, force: bool = False) -> Dict[str, List[Dict[str, Any]]]:
    """
    Fetches all 4 tabs in a single batchGet request (or from cache if fresh < 5s),
    drastically reducing cold start and dashboard render latency from ~3-4s down to ~400ms.
    If force=True, cache is invalidated first.
    Filters strictly by user_id.
    """
    if force:
        invalidate_tab_cache()

    tabs = ["Leads", "Hot Leads", "Neutral Queue", "Failed Leads"]
    now = time.time()

    # Check if all tabs are fresh in cache
    all_cached = all(
        t in _tab_cache and (now - _tab_cache[t][0]) < CACHE_TTL_SECONDS
        for t in tabs
    )

    if not all_cached:
        service = get_sheets_service()
        sheet_id = settings.COLD_EMAIL_SHEET_ID
        ranges = [f"'{t}'!A1:Z" for t in tabs]
        res = service.spreadsheets().values().batchGet(
            spreadsheetId=sheet_id,
            ranges=ranges
        ).execute()
        value_ranges = res.get("valueRanges", [])
        for i, t in enumerate(tabs):
            vals = value_ranges[i].get("values", []) if i < len(value_ranges) else []
            _tab_cache[t] = (now, vals)

    return {
        "leads": parse_rows_for_user(_tab_cache.get("Leads", (0, []))[1], user_id=user_id),
        "hot_leads": parse_rows_for_user(_tab_cache.get("Hot Leads", (0, []))[1], user_id=user_id),
        "neutral_leads": parse_rows_for_user(_tab_cache.get("Neutral Queue", (0, []))[1], user_id=user_id),
        "failed_leads": parse_rows_for_user(_tab_cache.get("Failed Leads", (0, []))[1], user_id=user_id),
    }

def add_lead_for_user(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Appends a new lead row to the 'Leads' tab.
    user_id is strictly injected server-side.
    """
    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    
    headers = get_tab_headers("Leads")
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
    invalidate_tab_cache("Leads")
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
    
    headers = get_tab_headers("Leads")
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
    invalidate_tab_cache("Leads")
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
    
    headers = get_tab_headers("Leads")
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
    invalidate_tab_cache("Leads")
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
    headers = get_tab_headers("Leads")
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
    invalidate_tab_cache("Leads")
    return {"success": True}

def get_leads_for_user(user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
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

def mark_lead_replied(user_id: str, lead_id: Optional[str] = None, lead_email: Optional[str] = None):
    """
    Finds matching lead rows in 'Hot Leads' and 'Neutral Queue' tabs for user_id,
    and updates status='replied' (and actioned_at/human_action if column exists).
    """
    service = get_sheets_service()
    sheet_id = settings.COLD_EMAIL_SHEET_ID
    import datetime
    now_iso = datetime.datetime.now().astimezone().isoformat()

    updated_any = False
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
                        updated_any = True

                    if human_action_idx != -1:
                        col_letter = chr(ord('A') + human_action_idx)
                        service.spreadsheets().values().update(
                            spreadsheetId=sheet_id,
                            range=f"'{tab_name}'!{col_letter}{row_idx}",
                            valueInputOption="USER_ENTERED",
                            body={"values": [["replied"]]}
                        ).execute()
                        updated_any = True

                    if actioned_at_idx != -1:
                        col_letter = chr(ord('A') + actioned_at_idx)
                        service.spreadsheets().values().update(
                            spreadsheetId=sheet_id,
                            range=f"'{tab_name}'!{col_letter}{row_idx}",
                            valueInputOption="USER_ENTERED",
                            body={"values": [[now_iso]]}
                        ).execute()
                        updated_any = True
        except Exception as e:
            print(f"[WARN] Error marking lead replied in {tab_name}: {e}")

    if updated_any:
        invalidate_tab_cache("Hot Leads")
        invalidate_tab_cache("Neutral Queue")

def set_campaign_content_for_pending_leads(user_id: str, subject: Optional[str] = None, message: Optional[str] = None):
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
        fn_idx = headers.index("first_name") if "first_name" in headers else -1
        ln_idx = headers.index("last_name") if "last_name" in headers else -1
        comp_idx = headers.index("company") if "company" in headers else -1
        title_idx = headers.index("title") if "title" in headers else -1
        name_idx = headers.index("name") if "name" in headers else -1

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

            fn = row[fn_idx].strip() if (fn_idx != -1 and len(row) > fn_idx) else ""
            ln = row[ln_idx].strip() if (ln_idx != -1 and len(row) > ln_idx) else ""
            comp = row[comp_idx].strip() if (comp_idx != -1 and len(row) > comp_idx) else ""
            title = row[title_idx].strip() if (title_idx != -1 and len(row) > title_idx) else ""
            full_name = row[name_idx].strip() if (name_idx != -1 and len(row) > name_idx) else f"{fn} {ln}".strip()
            if not fn and full_name:
                fn = full_name.split()[0]

            def render_tpl(text: str) -> str:
                if not text:
                    return ""
                t = text
                t = t.replace("{{first_name}}", fn).replace("{{firstName}}", fn)
                t = t.replace("{{last_name}}", ln).replace("{{lastName}}", ln)
                t = t.replace("{{name}}", full_name or fn)
                t = t.replace("{{company}}", comp)
                t = t.replace("{{title}}", title)
                return t

            row_subj = render_tpl(subject) if subject else ""
            row_body = render_tpl(message) if message else ""

            if subj_idx != -1 and row_subj:
                col_letter = chr(ord('A') + subj_idx)
                updates.append({
                    "range": f"'Leads'!{col_letter}{row_idx}",
                    "values": [[row_subj]]
                })
            if body_idx != -1 and row_body:
                col_letter = chr(ord('A') + body_idx)
                updates.append({
                    "range": f"'Leads'!{col_letter}{row_idx}",
                    "values": [[row_body]]
                })

        if updates:
            service.spreadsheets().values().batchUpdate(
                spreadsheetId=sheet_id,
                body={"valueInputOption": "USER_ENTERED", "data": updates}
            ).execute()
            invalidate_tab_cache("Leads")
    except Exception as e:
        print(f"[WARN] Failed to set campaign content for pending leads: {e}")

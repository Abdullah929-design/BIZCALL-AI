# api/modules/cold_email/gmail_service.py
"""
Personal Gmail BYOE (SMTP/IMAP) Service for Cold Email CRM.
- Supports Gmail & Google Workspace via App Passwords (smtp.gmail.com:465, imap.gmail.com:993).
- Shares the exact same Google Sheets 'Leads' pool as the Managed (Brevo/n8n) pipeline.
- Stores replies & AI classifications strictly isolated in Supabase ('gmail_crm_replies').
- Replicates all CRM rules: template rendering, threading, Groq classification,
  human-in-the-loop drafting, and log-only handling for negative/opt-out replies.
"""

import os
import re
import json
import time
import base64
import hashlib
import smtplib
import imaplib
import asyncio
import datetime
import email as email_lib
from email.header import decode_header
from email.mime.text import MIMEText
from email.utils import parseaddr, make_msgid
from typing import Dict, Any, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup
from cryptography.fernet import Fernet, InvalidToken

from . import sheets_client

GMAIL_SMTP_HOST = "smtp.gmail.com"
GMAIL_SMTP_PORT = 465
GMAIL_IMAP_HOST = "imap.gmail.com"
GMAIL_IMAP_PORT = 993

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip('"').strip("'").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip('"').strip("'")
GROQ_API_KEY = (os.getenv("GROQ_CLOUD_LAYER_API_KEY") or os.getenv("GROQ_API_KEY") or "").strip('"').strip("'")
GROQ_MODEL = (os.getenv("GROQ_CLOUD_LAYER_MODEL") or "openai/gpt-oss-20b").strip('"').strip("'")


def _get_fernet() -> Fernet:
    raw_key = (os.getenv("EMAIL_ENCRYPTION_KEY") or "").strip('"').strip("'")
    if raw_key:
        try:
            return Fernet(raw_key.encode("utf-8"))
        except Exception:
            pass
    # Deterministic fallback derived from SUPABASE_SERVICE_ROLE_KEY so container restarts never break decryption
    seed = (SUPABASE_SERVICE_ROLE_KEY or "bizcall-default-gmail-key").encode("utf-8")
    digest = hashlib.sha256(seed).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(plain: str) -> str:
    return _get_fernet().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_secret(token: str) -> str:
    try:
        return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        raise RuntimeError("Failed to decrypt stored Gmail App Password. Please reconnect your Gmail.")


def _sb_headers(prefer: str = "return=representation") -> Dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def _normalize_app_password(raw_pw: str) -> str:
    return re.sub(r"\s+", "", (raw_pw or "").strip())


# ---------------------------------------------------------------------------
# 1. Connection Verification & Supabase CRUD
# ---------------------------------------------------------------------------

def verify_gmail_credentials(gmail_address: str, app_password: str) -> Tuple[bool, str]:
    """Tests BOTH SMTP SSL (465) and IMAP SSL (993) login against Gmail."""
    addr = (gmail_address or "").strip().lower()
    pw = _normalize_app_password(app_password)
    if not addr or "@" not in addr:
        return False, "Please enter a valid Gmail address."
    if len(pw) < 12:
        return False, "Please enter a valid 16-character Gmail App Password (not your regular login password)."

    # Test SMTP
    try:
        with smtplib.SMTP_SSL(GMAIL_SMTP_HOST, GMAIL_SMTP_PORT, timeout=12) as server:
            server.login(addr, pw)
    except smtplib.SMTPAuthenticationError:
        return False, (
            "Gmail SMTP login rejected. Ensure 2-Step Verification is ON and you are using a "
            "16-character Google App Password."
        )
    except Exception as e:
        return False, f"SMTP connection failed: {str(e)}"

    # Test IMAP
    try:
        with imaplib.IMAP4_SSL(GMAIL_IMAP_HOST, GMAIL_IMAP_PORT, timeout=12) as mail:
            mail.login(addr, pw)
    except imaplib.IMAP4.error:
        return False, (
            "Gmail IMAP login rejected. Enable IMAP in Gmail Settings -> Forwarding and POP/IMAP "
            "and verify your App Password."
        )
    except Exception as e:
        return False, f"IMAP connection failed: {str(e)}"

    return True, "Verified"


def save_gmail_connection(user_id: str, gmail_address: str, app_password: str) -> Dict[str, Any]:
    addr = gmail_address.strip().lower()
    pw = _normalize_app_password(app_password)
    ok, msg = verify_gmail_credentials(addr, pw)
    if not ok:
        raise ValueError(msg)

    encrypted = encrypt_secret(pw)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    payload = {
        "user_id": user_id,
        "gmail_address": addr,
        "encrypted_app_password": encrypted,
        "is_active": True,
        "updated_at": now_iso,
    }

    url = f"{SUPABASE_URL}/rest/v1/user_gmail_connections?on_conflict=user_id"
    res = requests.post(
        url,
        headers=_sb_headers("resolution=merge-duplicates,return=representation"),
        json=payload,
        timeout=10,
    )
    if not res.ok:
        raise RuntimeError(f"Failed to save Gmail connection in Supabase: {res.text}")

    return {"connected": True, "gmail_address": addr, "last_synced_at": None}


def get_gmail_connection(user_id: str, include_secret: bool = False) -> Optional[Dict[str, Any]]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    url = f"{SUPABASE_URL}/rest/v1/user_gmail_connections?user_id=eq.{user_id}&is_active=eq.true&select=*"
    res = requests.get(url, headers=_sb_headers(), timeout=10)
    if not res.ok:
        return None
    rows = res.json()
    if not rows:
        return None
    row = rows[0]
    out = {
        "connected": True,
        "user_id": row["user_id"],
        "gmail_address": row["gmail_address"],
        "last_synced_at": row.get("last_synced_at"),
    }
    if include_secret:
        out["app_password"] = decrypt_secret(row["encrypted_app_password"])
    return out


def disconnect_gmail_connection(user_id: str) -> None:
    url = f"{SUPABASE_URL}/rest/v1/user_gmail_connections?user_id=eq.{user_id}"
    res = requests.delete(url, headers=_sb_headers(), timeout=10)
    if not res.ok:
        raise RuntimeError(f"Failed to disconnect Gmail: {res.text}")


# ---------------------------------------------------------------------------
# 2. Outbound Batch & Threaded Reply Sending via Personal Gmail SMTP
# ---------------------------------------------------------------------------

def send_gmail_batch(user_id: str, subject: Optional[str] = None, message: Optional[str] = None) -> Dict[str, Any]:
    """
    Sends all 'pending' leads for user_id from the shared Google Sheets 'Leads' tab
    via the user's connected Gmail SMTP, and updates 'Leads' status/sent_at in batch.
    """
    conn = get_gmail_connection(user_id, include_secret=True)
    if not conn:
        raise RuntimeError("No Personal Gmail account is connected. Please connect your Gmail first.")

    pending_leads = sheets_client.get_leads_for_user(user_id=user_id, status="pending")
    if not pending_leads:
        return {"sent": 0, "failed": 0, "message": "No pending leads found."}

    gmail_addr = conn["gmail_address"]
    app_pw = conn["app_password"]
    sent_count = 0
    failed_count = 0
    sheet_updates: List[Dict[str, Any]] = []

    with smtplib.SMTP_SSL(GMAIL_SMTP_HOST, GMAIL_SMTP_PORT, timeout=20) as server:
        server.login(gmail_addr, app_pw)

        for idx, lead in enumerate(pending_leads):
            to_email = (lead.get("email") or "").strip()
            if not to_email:
                continue

            raw_subj = subject or lead.get("email_subject") or "Quick question regarding {{company}}"
            raw_body = message or lead.get("email_body") or (
                "Hi {{first_name}},\n\nI noticed {{company}} and wanted to reach out.\n\nBest regards,"
            )

            rendered_subj = sheets_client.render_template_for_lead(raw_subj, lead)
            rendered_body = sheets_client.render_template_for_lead(raw_body, lead)

            msg = MIMEText(rendered_body, "plain", "utf-8")
            msg["From"] = gmail_addr
            msg["To"] = to_email
            msg["Subject"] = rendered_subj
            msg["Message-ID"] = make_msgid(domain="gmail.com")

            now_iso = datetime.datetime.now(datetime.timezone.utc).astimezone().isoformat()
            try:
                server.sendmail(gmail_addr, [to_email], msg.as_string())
                sent_count += 1
                sheet_updates.append({
                    "_row_number": lead.get("_row_number"),
                    "email": to_email,
                    "status": "sent",
                    "sent_at": now_iso,
                    "error_note": "",
                })
            except Exception as send_err:
                failed_count += 1
                sheet_updates.append({
                    "_row_number": lead.get("_row_number"),
                    "email": to_email,
                    "status": "failed",
                    "error_note": f"Gmail SMTP error: {str(send_err)[:140]}",
                })

            # Polite throttle to avoid Gmail spam triggers
            if idx < len(pending_leads) - 1:
                time.sleep(1.5)

    if sheet_updates:
        sheets_client.batch_update_leads_fields(user_id=user_id, row_updates=sheet_updates)

    return {"sent": sent_count, "failed": failed_count, "sender": gmail_addr}


def send_gmail_reply(
    user_id: str,
    lead_id: str,
    lead_email: str,
    subject: str,
    message_text: str,
) -> Dict[str, Any]:
    """Sends a threaded human-approved reply via the user's Personal Gmail SMTP."""
    conn = get_gmail_connection(user_id, include_secret=True)
    if not conn:
        raise RuntimeError("No Personal Gmail account is connected.")

    # Look up the inbound reply record for ownership check and In-Reply-To threading
    target_email = lead_email.strip().lower()
    url = (
        f"{SUPABASE_URL}/rest/v1/gmail_crm_replies"
        f"?user_id=eq.{user_id}&email=ilike.{target_email}&order=classified_at.desc&limit=5"
    )
    res = requests.get(url, headers=_sb_headers(), timeout=10)
    rows = res.json() if res.ok else []

    matched = next((r for r in rows if (lead_id and r.get("lead_id") == lead_id) or r.get("id") == lead_id), None)
    if not matched and rows:
        matched = rows[0]
    if not matched:
        raise PermissionError("Unauthorized: Reply record not found for your Personal Gmail inbox.")

    gmail_addr = conn["gmail_address"]
    app_pw = conn["app_password"]

    reply_subj = subject.strip() if subject.strip() else f"Re: {matched.get('subject') or 'Following up'}"
    if not reply_subj.lower().startswith("re:") and matched.get("subject"):
        reply_subj = f"Re: {matched['subject']}"

    mime_msg = MIMEText(message_text, "plain", "utf-8")
    mime_msg["From"] = gmail_addr
    mime_msg["To"] = lead_email.strip()
    mime_msg["Subject"] = reply_subj
    mime_msg["Message-ID"] = make_msgid(domain="gmail.com")
    orig_msg_id = (matched.get("message_id") or "").strip()
    if orig_msg_id:
        mime_msg["In-Reply-To"] = orig_msg_id
        mime_msg["References"] = orig_msg_id

    with smtplib.SMTP_SSL(GMAIL_SMTP_HOST, GMAIL_SMTP_PORT, timeout=15) as server:
        server.login(gmail_addr, app_pw)
        server.sendmail(gmail_addr, [lead_email.strip()], mime_msg.as_string())

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    patch_url = f"{SUPABASE_URL}/rest/v1/gmail_crm_replies?id=eq.{matched['id']}&user_id=eq.{user_id}"
    requests.patch(
        patch_url,
        headers=_sb_headers(),
        json={"human_action": "replied", "actioned_at": now_iso},
        timeout=10,
    )

    # Also keep shared 'Leads' tab status in sync
    sheets_client.batch_update_leads_fields(
        user_id=user_id,
        row_updates=[{"email": target_email, "status": "replied", "replied_at": now_iso}],
    )

    return {"status": "sent", "sender": gmail_addr, "threaded_to": orig_msg_id}


# ---------------------------------------------------------------------------
# 3. Inbound IMAP Reply Polling & Groq Classification (Log-Only on Failed)
# ---------------------------------------------------------------------------

def _decode_mime_header(raw_val: str) -> str:
    if not raw_val:
        return ""
    parts = decode_header(raw_val)
    decoded = []
    for chunk, charset in parts:
        if isinstance(chunk, bytes):
            decoded.append(chunk.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(str(chunk))
    return "".join(decoded).strip()


def _extract_body_and_strip_quotes(msg: email_lib.message.Message) -> str:
    plain_text = ""
    html_text = ""

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition") or "")
            if "attachment" in disp.lower():
                continue
            payload = part.get_payload(decode=True)
            if not payload:
                continue
            charset = part.get_content_charset() or "utf-8"
            text_val = payload.decode(charset, errors="replace")
            if ctype == "text/plain" and not plain_text:
                plain_text = text_val
            elif ctype == "text/html" and not html_text:
                html_text = text_val
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            raw_text = payload.decode(charset, errors="replace")
            if msg.get_content_type() == "text/html":
                html_text = raw_text
            else:
                plain_text = raw_text

    body = plain_text
    if not body and html_text:
        body = BeautifulSoup(html_text, "html.parser").get_text(separator="\n")

    # Strip quoted original email history ("On Mon, ... wrote:" or lines starting with ">")
    lines = []
    for line in body.splitlines():
        stripped = line.strip()
        if re.match(r"^On .+ wrote:\s*$", stripped):
            break
        if stripped.startswith(">"):
            continue
        if stripped in ("-----Original Message-----", "________________________________"):
            break
        lines.append(line)

    cleaned = "\n".join(lines).strip()
    return cleaned[:2500] if cleaned else body.strip()[:2500]


def classify_reply_with_groq(lead_name: str, company: str, reply_body: str) -> Dict[str, Any]:
    """Classifies an inbound prospect reply into 'hot', 'neutral', or 'failed' via Groq."""
    fallback = {
        "classification": "neutral",
        "confidence": 70,
        "reply_summary": reply_body[:160],
        "draft_reply": f"Hi {lead_name or 'there'},\n\nThank you for getting back to us! Happy to share more details—when works best for a quick call?\n\nBest regards,",
        "rejection_reason": "",
    }

    low = reply_body.lower()
    if any(k in low for k in ["unsubscribe", "remove me", "not interested", "stop emailing", "don't contact", "do not contact", "no thanks"]):
        fallback["classification"] = "failed"
        fallback["confidence"] = 92
        fallback["rejection_reason"] = "Prospect declined or requested removal from mailing list."
        fallback["draft_reply"] = ""
    elif any(k in low for k in ["interested", "schedule", "demo", "pricing", "quote", "book a call", "let's talk", "send details"]):
        fallback["classification"] = "hot"
        fallback["confidence"] = 85

    if not GROQ_API_KEY:
        return fallback

    system_prompt = (
        "You are an expert B2B sales email classifier. Classify the prospect's email reply into strictly one of:\n"
        "- 'hot': Clear buying intent—wants to schedule a call/demo/meeting, asks for pricing/quote/proposal, or asks to get started.\n"
        "- 'neutral': Polite/lukewarm or ambiguous—asks for a brochure or general info without committing to a call, says 'maybe later'/'check back next quarter', out-of-office, or forwarding to a colleague.\n"
        "- 'failed': Explicit rejection, not interested, unsubscribe, remove me, do not contact, or bounce notice.\n\n"
        "Respond with ONLY valid JSON containing these exact keys:\n"
        '{"classification": "hot|neutral|failed", "confidence": 0-100, '
        '"reply_summary": "1-2 sentence summary", '
        '"draft_reply": "Polite concise follow-up reply (empty string if failed)", '
        '"rejection_reason": "Reason if failed, else empty string"}'
    )
    user_prompt = f"Prospect: {lead_name} ({company})\nReply:\n{reply_body}"

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 1200,
                "response_format": {"type": "json_object"},
            },
            timeout=18,
        )
        if resp.ok:
            content = resp.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            cls = str(parsed.get("classification", "neutral")).strip().lower()
            if cls not in ("hot", "neutral", "failed"):
                cls = "neutral"
            return {
                "classification": cls,
                "confidence": int(parsed.get("confidence", 80)),
                "reply_summary": str(parsed.get("reply_summary", ""))[:400],
                "draft_reply": "" if cls == "failed" else str(parsed.get("draft_reply", "")),
                "rejection_reason": str(parsed.get("rejection_reason", "")) if cls == "failed" else "",
            }
        else:
            print(f"[gmail_service] Groq API error ({resp.status_code}): {resp.text[:300]}")
    except Exception as e:
        print(f"[gmail_service] Groq classify fallback: {e}")

    return fallback


def sync_gmail_inbox_for_user(user_id: str) -> Dict[str, Any]:
    """
    Polls the user's connected Gmail IMAP INBOX for UNSEEN replies from known leads
    in Google Sheets, classifies them with Groq, and stores them in 'gmail_crm_replies'.
    Never sends auto-confirmations on 'failed' replies.
    """
    conn = get_gmail_connection(user_id, include_secret=True)
    if not conn:
        return {"synced": 0, "skipped": True}

    all_leads = sheets_client.get_leads_for_user(user_id=user_id)
    lead_by_email: Dict[str, Dict[str, Any]] = {}
    for l in all_leads:
        em = (l.get("email") or "").strip().lower()
        if em:
            lead_by_email[em] = l

    if not lead_by_email:
        return {"synced": 0, "new_replies": 0}

    gmail_addr = conn["gmail_address"]
    app_pw = conn["app_password"]
    new_replies = 0
    lead_sheet_updates: List[Dict[str, Any]] = []

    with imaplib.IMAP4_SSL(GMAIL_IMAP_HOST, GMAIL_IMAP_PORT, timeout=15) as mail:
        mail.login(gmail_addr, app_pw)
        mail.select("INBOX")

        # Search recent messages (both SEEN and UNSEEN) so replies opened in Gmail aren't skipped;
        # deduplication by message_id in Supabase prevents double-processing.
        since_date = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=3)).strftime("%d-%b-%Y")
        status, msg_nums = mail.search(None, f'(SINCE "{since_date}")')
        if status != "OK" or not msg_nums or not msg_nums[0]:
            _update_last_synced(user_id)
            return {"synced": 0, "new_replies": 0}

        uid_list = msg_nums[0].split()[-50:]  # Process up to 50 latest recent emails per cycle
        for num in uid_list:
            # Peek without marking seen unless it belongs to a CRM lead
            typ, msg_data = mail.fetch(num, "(BODY.PEEK[])")
            if typ != "OK" or not msg_data or not isinstance(msg_data[0], tuple):
                continue

            raw_email = msg_data[0][1]
            parsed = email_lib.message_from_bytes(raw_email)
            _, sender_addr = parseaddr(_decode_mime_header(parsed.get("From", "")))
            sender_addr = sender_addr.strip().lower()

            if not sender_addr or sender_addr == gmail_addr or sender_addr not in lead_by_email:
                # Ignore unrelated personal emails in the user's Gmail inbox
                continue

            lead = lead_by_email[sender_addr]
            msg_id = (parsed.get("Message-ID") or f"imap-{user_id}-{num.decode()}").strip()
            subj = _decode_mime_header(parsed.get("Subject", ""))
            body = _extract_body_and_strip_quotes(parsed)
            if not body:
                continue

            # Deduplicate in Supabase
            chk_url = f"{SUPABASE_URL}/rest/v1/gmail_crm_replies?user_id=eq.{user_id}&message_id=eq.{requests.utils.quote(msg_id)}&select=id"
            chk_res = requests.get(chk_url, headers=_sb_headers(), timeout=8)
            if chk_res.ok and chk_res.json():
                mail.store(num, "+FLAGS", "\\Seen")
                continue

            lead_name = lead.get("name") or f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip()
            company = lead.get("company") or ""
            cls_result = classify_reply_with_groq(lead_name, company, body)
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

            insert_payload = {
                "user_id": user_id,
                "lead_id": lead.get("id") or lead.get("lead_id") or str(lead.get("_row_number", "")),
                "name": lead_name,
                "email": sender_addr,
                "company": company,
                "classification": cls_result["classification"],
                "reply_body": body,
                "reply_summary": cls_result["reply_summary"],
                "draft_reply": cls_result["draft_reply"],
                "confidence": cls_result["confidence"],
                "rejection_reason": cls_result["rejection_reason"],
                "subject": subj,
                "message_id": msg_id,
                "classified_at": now_iso,
            }

            ins_res = requests.post(
                f"{SUPABASE_URL}/rest/v1/gmail_crm_replies",
                headers=_sb_headers(),
                json=insert_payload,
                timeout=10,
            )
            if ins_res.ok:
                mail.store(num, "+FLAGS", "\\Seen")
                new_replies += 1
                lead_sheet_updates.append({
                    "_row_number": lead.get("_row_number"),
                    "email": sender_addr,
                    "replied_at": now_iso,
                })
            else:
                print(f"[gmail_service] Supabase insert error ({ins_res.status_code}): {ins_res.text}")

    if lead_sheet_updates:
        sheets_client.batch_update_leads_fields(user_id=user_id, row_updates=lead_sheet_updates)

    _update_last_synced(user_id)
    return {"synced": len(uid_list), "new_replies": new_replies}


def _update_last_synced(user_id: str) -> None:
    try:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/user_gmail_connections?user_id=eq.{user_id}",
            headers=_sb_headers(),
            json={"last_synced_at": now_iso},
            timeout=6,
        )
    except Exception:
        pass


def fetch_gmail_replies_bundle(user_id: str) -> Dict[str, List[Dict[str, Any]]]:
    """Returns hot_leads, neutral_leads, failed_leads formatted identically to ColdEmailLead."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return {"hot_leads": [], "neutral_leads": [], "failed_leads": []}

    url = f"{SUPABASE_URL}/rest/v1/gmail_crm_replies?user_id=eq.{user_id}&order=classified_at.desc"
    res = requests.get(url, headers=_sb_headers(), timeout=10)
    rows = res.json() if res.ok else []

    hot, neutral, failed = [], [], []
    for idx, r in enumerate(rows):
        item = {
            "_row_number": idx + 1,
            "id": r.get("id"),
            "user_id": r.get("user_id"),
            "lead_id": r.get("lead_id") or r.get("id"),
            "name": r.get("name") or "",
            "email": r.get("email") or "",
            "company": r.get("company") or "",
            "subject": r.get("subject") or "",
            "reply_body": r.get("reply_body") or "",
            "reply_content": r.get("reply_body") or "",
            "reply_summary": r.get("reply_summary") or "",
            "draft_reply": r.get("draft_reply") or "",
            "confidence": r.get("confidence") or 0,
            "rejection_reason": r.get("rejection_reason") or "",
            "gmail_thread_id": r.get("message_id") or "",
            "human_action": r.get("human_action") or "",
            "status": "replied" if r.get("human_action") == "replied" else r.get("classification"),
            "actioned_at": r.get("actioned_at") or "",
            "classified_at": r.get("classified_at") or "",
        }
        cls = r.get("classification")
        if cls == "hot":
            hot.append(item)
        elif cls == "failed":
            failed.append(item)
        else:
            neutral.append(item)

    return {"hot_leads": hot, "neutral_leads": neutral, "failed_leads": failed}


# ---------------------------------------------------------------------------
# 4. Background 60s IMAP Poller
# ---------------------------------------------------------------------------

async def gmail_imap_poll_loop():
    """Polls all active Personal Gmail connections every 60 seconds."""
    await asyncio.sleep(10)  # Let FastAPI finish startup
    while True:
        try:
            if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
                url = f"{SUPABASE_URL}/rest/v1/user_gmail_connections?is_active=eq.true&select=user_id"
                res = await asyncio.to_thread(requests.get, url, headers=_sb_headers(), timeout=10)
                if res.ok:
                    for row in res.json():
                        uid = row.get("user_id")
                        if uid:
                            try:
                                await asyncio.to_thread(sync_gmail_inbox_for_user, uid)
                            except Exception as user_err:
                                print(f"[gmail_poller] sync error for {uid}: {user_err}")
        except Exception as loop_err:
            print(f"[gmail_poller] loop warning: {loop_err}")

        await asyncio.sleep(60)

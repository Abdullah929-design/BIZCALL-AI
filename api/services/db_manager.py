"""
Database manager for the `calls` table, talking directly to Supabase's
PostgREST API with the service-role key (server-side only — bypasses RLS).
"""
import os
import requests
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

CALLS_ENDPOINT = f"{SUPABASE_URL}/rest/v1/calls"

ACTIVE_STATUSES = ["ringing", "active", "in_progress", "registered"]


def _headers(extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured in api/.env"
        )
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def upsert_call(call_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create or fully replace a call row (matched on call_id)."""
    headers = _headers({"Prefer": "resolution=merge-duplicates,return=representation"})
    resp = requests.post(CALLS_ENDPOINT, headers=headers, json=call_data, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if isinstance(data, list) and data else data


def update_call_status(
    call_id: str, status: str, extra_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """PATCH specific fields on an existing call row."""
    payload: Dict[str, Any] = {"status": status}
    if extra_data:
        payload.update(extra_data)

    headers = _headers({"Prefer": "return=representation"})
    params = {"call_id": f"eq.{call_id}"}
    resp = requests.patch(CALLS_ENDPOINT, headers=headers, params=params, json=payload, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if isinstance(data, list) and data else data


def get_active_calls_count(direction: str) -> int:
    """Count calls in an active-ish state for a given direction (inbound/outbound)."""
    headers = _headers({"Prefer": "count=exact"})
    status_filter = ",".join(ACTIVE_STATUSES)
    params = {
        "direction": f"eq.{direction}",
        "status": f"in.({status_filter})",
        "select": "call_id",
    }
    resp = requests.get(CALLS_ENDPOINT, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    content_range = resp.headers.get("content-range", "")  # e.g. "0-1/2"
    if "/" in content_range:
        try:
            return int(content_range.split("/")[-1])
        except ValueError:
            pass
    return len(resp.json())


def get_call(call_id: str) -> Optional[Dict[str, Any]]:
    headers = _headers()
    params = {"call_id": f"eq.{call_id}", "select": "*"}
    resp = requests.get(CALLS_ENDPOINT, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if data else None


def list_recent_calls(limit: int = 50) -> List[Dict[str, Any]]:
    headers = _headers()
    params = {"select": "*", "order": "created_at.desc", "limit": str(limit)}
    resp = requests.get(CALLS_ENDPOINT, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()

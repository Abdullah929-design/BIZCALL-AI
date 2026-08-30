"""
Database manager for the `calls` table, talking directly to Supabase's
PostgREST API with the service-role key (server-side only — bypasses RLS).
"""
import os
import requests
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=True))
_root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
if os.path.exists(_root_env):
    load_dotenv(_root_env)

ACTIVE_STATUSES = ["ringing", "active", "in_progress", "registered"]

def _get_supabase_config():
    url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured"
        )
    endpoint = f"{url}/rest/v1/calls"
    return url, key, endpoint

def _headers(extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    _, key, _ = _get_supabase_config()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def upsert_call(call_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create or fully replace a call row (matched on call_id)."""
    _, _, endpoint = _get_supabase_config()
    headers = _headers({"Prefer": "resolution=merge-duplicates,return=representation"})
    resp = requests.post(endpoint, headers=headers, json=call_data, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if isinstance(data, list) and data else data


def update_call_status(
    call_id: str, status: str, extra_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """PATCH specific fields on an existing call row."""
    _, _, endpoint = _get_supabase_config()
    payload: Dict[str, Any] = {"status": status}
    if extra_data:
        payload.update(extra_data)

    headers = _headers({"Prefer": "return=representation"})
    params = {"call_id": f"eq.{call_id}"}
    resp = requests.patch(endpoint, headers=headers, params=params, json=payload, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if isinstance(data, list) and data else data


def get_active_calls_count(direction: str) -> int:
    """Count calls in an active state for a given direction within the last 15 minutes."""
    _, _, endpoint = _get_supabase_config()
    headers = _headers({"Prefer": "count=exact"})
    status_filter = ",".join(ACTIVE_STATUSES)
    from datetime import datetime, timezone, timedelta
    fifteen_mins_ago = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    params = {
        "direction": f"eq.{direction}",
        "status": f"in.({status_filter})",
        "created_at": f"gte.{fifteen_mins_ago}",
        "select": "call_id",
    }
    resp = requests.get(endpoint, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    content_range = resp.headers.get("content-range", "")  # e.g. "0-1/2"
    if "/" in content_range:
        try:
            return int(content_range.split("/")[-1])
        except ValueError:
            pass
    return len(resp.json())


def get_call(call_id: str) -> Optional[Dict[str, Any]]:
    _, _, endpoint = _get_supabase_config()
    headers = _headers()
    params = {"call_id": f"eq.{call_id}", "select": "*"}
    resp = requests.get(endpoint, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if data else None


def list_recent_calls(limit: int = 50) -> List[Dict[str, Any]]:
    _, _, endpoint = _get_supabase_config()
    headers = _headers()
    params = {"select": "*", "order": "created_at.desc", "limit": str(limit)}
    resp = requests.get(endpoint, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()

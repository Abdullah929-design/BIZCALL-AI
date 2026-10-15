# api/modules/cold_email/auth.py
import os
import requests
from fastapi import Header, HTTPException

class AuthenticatedUser:
    def __init__(self, user_id: str, email: str = ""):
        self.id = user_id
        self.email = email

def get_current_user(authorization: str = Header(None)) -> AuthenticatedUser:
    """
    Derives authenticated user_id securely from the Supabase session token.
    Runs synchronously in the worker threadpool so it never blocks the FastAPI event loop.
    The client NEVER passes user_id directly.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1].strip()

    # Reject obviously malformed or empty tokens early
    if not token or len(token) < 10:
        raise HTTPException(status_code=401, detail="Empty or malformed token")

    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase configuration missing on server")

    # Verify session token against Supabase auth using synchronous HTTP in threadpool
    try:
        resp = requests.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {token}"
            },
            timeout=8.0
        )

        if resp.status_code in (401, 403):
            raise HTTPException(status_code=401, detail="Invalid or expired session token")

        if resp.status_code != 200:
            print(f"[cold_email auth] Supabase returned status {resp.status_code}: {resp.text[:200]}")
            raise HTTPException(status_code=401, detail=f"Session verification failed (status {resp.status_code})")

        user_data = resp.json()
        user_id = user_data.get("id")
        email = user_data.get("email", "")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in session")

        return AuthenticatedUser(user_id=user_id, email=email)

    except HTTPException:
        raise
    except requests.Timeout:
        print("[cold_email auth] Supabase token verification timed out")
        raise HTTPException(status_code=503, detail="Authentication service timed out, please retry")
    except requests.ConnectionError as e:
        print(f"[cold_email auth] Supabase connection error: {e}")
        raise HTTPException(status_code=503, detail="Cannot reach authentication service")
    except Exception as e:
        print(f"[cold_email auth] Unexpected verification error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication verification failed: {str(e)}")

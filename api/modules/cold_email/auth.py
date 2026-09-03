# api/modules/cold_email/auth.py
import os
import requests
from fastapi import Header, HTTPException

class AuthenticatedUser:
    def __init__(self, user_id: str, email: str = ""):
        self.id = user_id
        self.email = email

async def get_current_user(authorization: str = Header(None)) -> AuthenticatedUser:
    """
    Derives authenticated user_id securely from the Supabase session token.
    The client NEVER passes user_id directly.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase configuration missing on server")

    # Verify session token against Supabase auth
    try:
        resp = requests.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {token}"
            },
            timeout=5
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
        
        user_data = resp.json()
        user_id = user_data.get("id")
        email = user_data.get("email", "")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in session")

        return AuthenticatedUser(user_id=user_id, email=email)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication verification failed: {str(e)}")

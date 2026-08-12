from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://uwtbxipuwtbcebu9n7gl.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "sb_publishable_G_UrtxiPuwtb_cE-bu9n7g_Lc7dB1E0")

class AuthRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
async def signup(req: AuthRequest):
    """Handle Supabase user registration via backend API proxy."""
    try:
        url = f"{SUPABASE_URL}/auth/v1/signup"
        payload = json.dumps({"email": req.email, "password": req.password}).encode('utf-8')
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }
        
        request = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(request) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return {"success": True, "data": res_data}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"❌ [Supabase Signup Error HTTP {e.code}]: {err_body}")
        try:
            err_json = json.loads(err_body)
            msg = err_json.get("msg") or err_json.get("error_description") or err_json.get("message") or err_body
        except Exception:
            msg = err_body
        raise HTTPException(status_code=e.code, detail=msg)
    except urllib.error.URLError as e:
        print(f"❌ [Supabase Connection/DNS Error]: {e.reason}")
        raise HTTPException(
            status_code=502,
            detail=f"Cannot connect to Supabase at {SUPABASE_URL} ({e.reason}). Please check your SUPABASE_URL in .env or verify your Supabase project is running."
        )
    except Exception as e:
        print(f"❌ [Signup General Error]: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(req: AuthRequest):
    """Handle Supabase user login via backend API proxy."""
    try:
        url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        payload = json.dumps({"email": req.email, "password": req.password}).encode('utf-8')
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }
        
        request = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(request) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return {"success": True, "data": res_data}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"❌ [Supabase Login Error HTTP {e.code}]: {err_body}")
        try:
            err_json = json.loads(err_body)
            msg = err_json.get("msg") or err_json.get("error_description") or err_json.get("message") or err_body
        except Exception:
            msg = err_body
        raise HTTPException(status_code=e.code, detail=msg)
    except urllib.error.URLError as e:
        print(f"❌ [Supabase Connection/DNS Error]: {e.reason}")
        raise HTTPException(
            status_code=502,
            detail=f"Cannot connect to Supabase at {SUPABASE_URL} ({e.reason}). Please check your SUPABASE_URL in .env or verify your Supabase project is running."
        )
    except Exception as e:
        print(f"❌ [Login General Error]: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

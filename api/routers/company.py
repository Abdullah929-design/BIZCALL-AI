from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import requests
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

def fetch_profile_from_supabase(user_id: str) -> Optional[Dict[str, Any]]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/company_profiles?user_id=eq.{user_id}&select=*"
        res = requests.get(url, headers=get_supabase_headers(), timeout=10)
        res.raise_for_status()
        data = res.json()
        return data[0] if data else None
    except Exception as e:
        print(f"[company] error fetching profile from Supabase: {e}")
        return None

def save_profile_to_supabase(profile_data: Dict[str, Any]) -> bool:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return False
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/company_profiles"
        headers = get_supabase_headers()
        headers["Prefer"] = "resolution=merge-duplicates"
        res = requests.post(url, headers=headers, json=profile_data, timeout=10)
        res.raise_for_status()
        return True
    except Exception as e:
        print(f"[company] error saving profile to Supabase: {e}")
        return False

class CompanyProfileRequest(BaseModel):
    user_id: str
    company_name: Optional[str] = ""
    industry: Optional[str] = ""
    target_audience: Optional[str] = ""
    primary_goal: Optional[str] = ""
    support_email: Optional[str] = ""
    phone: Optional[str] = ""
    website: Optional[str] = ""
    business_hours: Optional[str] = ""
    knowledge_base_notes: Optional[str] = ""
    custom_instructions: Optional[str] = ""

class OnboardingChatRequest(BaseModel):
    user_id: str
    messages: List[Dict[str, str]]
    current_profile: Optional[Dict[str, Any]] = None

@router.get("/profile/{user_id}")
async def get_company_profile(user_id: str):
    """Retrieve company profile for a logged-in user."""
    print(f"[DEBUG GET PROFILE] user_id: {user_id}")
    profile = fetch_profile_from_supabase(user_id)
    if not profile:
        profile = {
            "user_id": user_id,
            "company_name": "My Business",
            "industry": "Customer Service & Sales",
            "target_audience": "General Customers",
            "primary_goal": "Automate Inbound & Outbound Calls",
            "support_email": "",
            "phone": "",
            "website": "",
            "business_hours": "9:00 AM - 6:00 PM EST",
            "knowledge_base_notes": "We provide 24/7 AI call center support and automated lead follow-ups.",
            "custom_instructions": "Be professional, polite, and helpful at all times.",
            "onboarding_completed": False
        }
    return {"success": True, "profile": profile}

@router.post("/profile")
async def save_company_profile(req: CompanyProfileRequest):
    """Save or update company profile for a user."""
    print(f"[DEBUG POST PROFILE] user_id: {req.user_id}")
    profile_data = req.dict()
    profile_data["onboarding_completed"] = True
    save_profile_to_supabase(profile_data)
    return {"success": True, "profile": profile_data, "message": "Company profile saved successfully!"}

@router.post("/onboard-chat")
async def onboard_chat(req: OnboardingChatRequest):
    """Interactive AI Assistant Chatbot to guide company onboarding and automatically save profile."""
    user_msg = req.messages[-1].get("content", "") if req.messages else ""
    user_id = req.user_id

    # 1. Fetch current profile or initialize
    profile = fetch_profile_from_supabase(user_id) or {
        "user_id": user_id,
        "company_name": "",
        "industry": "",
        "target_audience": "General Customers",
        "primary_goal": "",
        "support_email": "",
        "phone": "",
        "website": "",
        "business_hours": "9:00 AM - 6:00 PM EST",
        "knowledge_base_notes": "",
        "custom_instructions": "",
        "onboarding_completed": False
    }

    step_count = len([m for m in req.messages if m.get("role") == "user"])
    msg_lower = user_msg.lower()

    ai_reply = ""
    updated_fields = {}

    import re

    # 2. Smart Multi-Entity Extractor (Parses fields regardless of step or order)
    extracted = []
    
    # Extract Company Name
    comp_match = re.search(r'(?:company\s*name|company|business\s*name)\s*[:=\-]\s*([^,\n;]+)', user_msg, re.IGNORECASE)
    comp_phrase_match = re.search(r'(?:my\s+company\s+is|our\s+company\s+is|company\s+name\s+is|change\s+company\s+to|change\s+company\s+name\s+to)\s+([^,\n;]+)', user_msg, re.IGNORECASE)
    if comp_match:
        profile["company_name"] = comp_match.group(1).strip()
        extracted.append(f"Company Name (**{profile['company_name']}**)")
    elif comp_phrase_match:
        profile["company_name"] = comp_phrase_match.group(1).strip()
        extracted.append(f"Company Name (**{profile['company_name']}**)")
    elif not profile.get("company_name") and len(user_msg.split()) <= 4 and "faq" not in user_msg.lower() and "http" not in user_msg.lower():
        clean_name = re.sub(r'^(my company is|our company is|we are|it is)\s+', '', user_msg, flags=re.I).strip()
        profile["company_name"] = clean_name
        extracted.append(f"Company Name (**{profile['company_name']}**)")

    # Extract Industry
    ind_match = re.search(r'(?:industry|niche|sector|field)\s*[:=\-]\s*([^,\n;]+)', user_msg, re.IGNORECASE)
    ind_phrase_match = re.search(r'(?:my\s+niche\s+is|our\s+niche\s+is|niche\s+is|industry\s+is|change\s+industry\s+to|change\s+niche\s+to)\s+([^,\n;]+)', user_msg, re.IGNORECASE)
    if ind_match:
        profile["industry"] = ind_match.group(1).strip()
        extracted.append(f"Industry (**{profile['industry']}**)")
    elif ind_phrase_match:
        profile["industry"] = ind_phrase_match.group(1).strip()
        extracted.append(f"Industry (**{profile['industry']}**)")
    elif ("telecom" in user_msg.lower() or "bank" in user_msg.lower() or "health" in user_msg.lower() or "real estate" in user_msg.lower() or "retail" in user_msg.lower()) and not profile.get("industry"):
        profile["industry"] = user_msg.strip()
        extracted.append(f"Industry (**{profile['industry']}**)")

    # Extract Primary Goal / Use Case
    goal_match = re.search(r'(?:goal|use case|purpose|objective|need)\s*[:=\-]\s*([^,\n;]+)', user_msg, re.IGNORECASE)
    goal_phrase_match = re.search(r'(?:my\s+goal\s+is|our\s+goal\s+is|primary\s+goal\s+is|change\s+goal\s+to)\s+([^,\n;]+)', user_msg, re.IGNORECASE)
    if goal_match:
        profile["primary_goal"] = goal_match.group(1).strip()
        extracted.append(f"Primary Goal (**{profile['primary_goal']}**)")
    elif goal_phrase_match:
        profile["primary_goal"] = goal_phrase_match.group(1).strip()
        extracted.append(f"Primary Goal (**{profile['primary_goal']}**)")
    elif ("support" in user_msg.lower() or "sales" in user_msg.lower() or "customer service" in user_msg.lower() or "lead" in user_msg.lower()) and not profile.get("primary_goal"):
        profile["primary_goal"] = user_msg.strip()
        extracted.append(f"Primary Goal (**{profile['primary_goal']}**)")

    # Extract Knowledge Base / FAQ
    if "faq" in user_msg.lower() or "price" in user_msg.lower() or "usd" in user_msg.lower() or "$" in user_msg or "bps" in user_msg or "offer" in user_msg or "package" in user_msg:
        kb_text = re.sub(r'^(faq\s*[:=\-]|knowledge base\s*[:=\-])\s*', '', user_msg, flags=re.I).strip()
        current_kb = profile.get("knowledge_base_notes", "")
        if kb_text not in current_kb:
            profile["knowledge_base_notes"] = (current_kb + "\n" + kb_text).strip()
        extracted.append("Knowledge Base & FAQs")

    # Extract Contact / Web / Instructions
    if "@" in user_msg:
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', user_msg)
        if email_match:
            profile["support_email"] = email_match.group(0)
            extracted.append(f"Support Email (**{profile['support_email']}**)")

    if "http" in user_msg or "www." in user_msg or ".com" in user_msg:
        web_match = re.search(r'(https?://[^\s]+|www\.[^\s]+)', user_msg)
        if web_match:
            profile["website"] = web_match.group(0)
            extracted.append(f"Website (**{profile['website']}**)")

    # Formulate conversational response based on missing fields
    if not profile.get("company_name"):
        ai_reply = "Welcome! What is your **Company Name**?"
    elif not profile.get("industry"):
        ai_reply = f"Great! I've set your Company Name to **{profile['company_name']}**. What **industry** do you operate in?"
    elif not profile.get("primary_goal"):
        ai_reply = f"Awesome. What is your **primary goal** for AI voice agents (e.g. Inbound Customer Support or Outbound Sales)?"
    elif not profile.get("knowledge_base_notes"):
        ai_reply = f"Got it! I have saved your company goals. Could you share your **business FAQs, pricing, or package details** for the AI Knowledge Base?"
    else:
        profile["onboarding_completed"] = True
        if extracted:
            ai_reply = f"✅ Updated: {', '.join(extracted)}. Your Company Profile & AI Knowledge Base are completely saved and up to date!"
        else:
            ai_reply = "🎉 Your Company Profile and AI Knowledge Base are fully saved and ready! You can review or edit everything anytime in the **Profile & KB Settings** tab."

    # Save to Supabase
    save_profile_to_supabase(profile)

    return {
        "success": True,
        "reply": ai_reply,
        "updated_profile": profile,
        "extracted_fields": updated_fields
    }

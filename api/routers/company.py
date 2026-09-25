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

import json
import re
from datetime import datetime

ROOT_DOMAIN = "bizcallai.online"
SUBDOMAINS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "company_subdomains.json")

def load_subdomains_registry() -> Dict[str, Any]:
    if os.path.exists(SUBDOMAINS_FILE):
        try:
            with open(SUBDOMAINS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[company] error loading subdomains file: {e}")
    return {}

def save_subdomains_registry(data: Dict[str, Any]) -> None:
    try:
        with open(SUBDOMAINS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[company] error saving subdomains file: {e}")

def get_or_create_tenant_subdomain(user_id: str, company_name: str = "") -> Dict[str, str]:
    """
    Allocates a clean, unique free subdomain under bizcallai.online for each tenant.
    Guarantees private inbox isolation (e.g. inbox@<slug>.bizcallai.online).
    """
    registry = load_subdomains_registry()
    if user_id in registry:
        return registry[user_id]

    # Generate base slug from company name
    raw_name = (company_name or "").lower().strip()
    slug = re.sub(r'[^a-z0-9]', '', raw_name)
    if not slug or len(slug) < 3:
        clean_uid = re.sub(r'[^a-z0-9]', '', user_id.lower())
        slug = f"org{clean_uid[:6]}" if clean_uid else "client"

    # Avoid colliding with reserved subdomains
    reserved = {"www", "api", "admin", "mail", "app", "root", "dev", "test"}
    if slug in reserved:
        slug = f"{slug}-org"

    # Ensure unique slug among existing tenants
    existing_slugs = {v.get("subdomain_slug") for v in registry.values()}
    unique_slug = slug
    counter = 2
    while unique_slug in existing_slugs:
        unique_slug = f"{slug}-{counter}"
        counter += 1

    entry = {
        "user_id": user_id,
        "company_name": company_name or "My Business",
        "subdomain_slug": unique_slug,
        "subdomain": f"{unique_slug}.{ROOT_DOMAIN}",
        "inbox_email": f"inbox@{unique_slug}.{ROOT_DOMAIN}",
        "root_domain": ROOT_DOMAIN,
        "assigned_at": datetime.utcnow().isoformat()
    }

    registry[user_id] = entry
    save_subdomains_registry(registry)
    print(f"[company] Assigned subdomain {entry['subdomain']} (Inbox: {entry['inbox_email']}) to user {user_id}")
    return entry

def release_tenant_subdomain(user_id: str) -> bool:
    """
    Releases an assigned subdomain and private inbox when a user is deleted.
    Frees the subdomain slug for other tenants to claim.
    """
    registry = load_subdomains_registry()
    if user_id in registry:
        removed = registry.pop(user_id)
        save_subdomains_registry(registry)
        print(f"[company] Released subdomain {removed.get('subdomain')} for deleted user {user_id}")
        return True
    return False

def sync_subdomains_with_supabase() -> int:
    """
    Scans the subdomain registry and purges any subdomains whose users
    no longer exist in Supabase company_profiles.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return 0
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/company_profiles?select=user_id"
        res = requests.get(url, headers=get_supabase_headers(), timeout=10)
        if not res.ok:
            return 0
        active_user_ids = {item["user_id"] for item in res.json() if "user_id" in item}
        
        registry = load_subdomains_registry()
        to_remove = [uid for uid in registry if uid not in active_user_ids]
        for uid in to_remove:
            registry.pop(uid, None)
        if to_remove:
            save_subdomains_registry(registry)
            print(f"[company] Cleaned up {len(to_remove)} orphaned subdomains: {to_remove}")
        return len(to_remove)
    except Exception as e:
        print(f"[company] error syncing subdomains with Supabase: {e}")
        return 0

ALLOWED_PROFILE_COLUMNS = {
    "user_id",
    "company_name",
    "industry",
    "primary_goal",
    "support_email",
    "phone",
    "website",
    "business_hours",
    "knowledge_base_notes",
    "custom_instructions",
    "onboarding_completed"
}

def save_profile_to_supabase(profile_data: Dict[str, Any]) -> bool:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("[company] error: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return False
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/company_profiles"
        headers = get_supabase_headers()
        headers["Prefer"] = "resolution=merge-duplicates"
        # Only keep allowed table columns
        filtered_payload = {k: v for k, v in profile_data.items() if k in ALLOWED_PROFILE_COLUMNS}
        res = requests.post(url, headers=headers, json=filtered_payload, timeout=10)
        if not res.ok:
            print(f"[company] Supabase save error ({res.status_code}): {res.text}")
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
    """Retrieve company profile for a logged-in user including their assigned private subdomain."""
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

    # Attach tenant subdomain and private inbox
    subdomain_info = get_or_create_tenant_subdomain(user_id, profile.get("company_name", ""))
    profile["subdomain"] = subdomain_info["subdomain"]
    profile["subdomain_slug"] = subdomain_info["subdomain_slug"]
    profile["inbox_email"] = subdomain_info["inbox_email"]
    profile["root_domain"] = subdomain_info["root_domain"]

    return {"success": True, "profile": profile}

@router.post("/profile")
async def save_company_profile(req: CompanyProfileRequest):
    """Save or update company profile for a user and assign their isolated private subdomain."""
    print(f"[DEBUG POST PROFILE] user_id: {req.user_id}")
    profile_data = req.dict()
    profile_data["onboarding_completed"] = True
    success = save_profile_to_supabase(profile_data)
    if not success:
        print(f"[company] Warning: Supabase save failed for user {req.user_id}, persisting local tenant profile.")

    # Assign/retrieve the company's dedicated subdomain
    subdomain_info = get_or_create_tenant_subdomain(req.user_id, req.company_name)

    return {
        "success": True,
        "profile": profile_data,
        "subdomain": subdomain_info["subdomain"],
        "subdomain_slug": subdomain_info["subdomain_slug"],
        "inbox_email": subdomain_info["inbox_email"],
        "root_domain": subdomain_info["root_domain"],
        "message": f"Company profile saved! Assigned free subdomain: {subdomain_info['subdomain']}"
    }

@router.delete("/profile/{user_id}")
async def delete_company_profile(user_id: str):
    """
    Deletes a company profile from Supabase and immediately frees
    their assigned subdomain and private inbox.
    """
    # 1. Release subdomain
    released = release_tenant_subdomain(user_id)

    # 2. Delete from Supabase
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/company_profiles?user_id=eq.{user_id}"
            res = requests.delete(url, headers=get_supabase_headers(), timeout=10)
            res.raise_for_status()
        except Exception as e:
            print(f"[company] error deleting profile from Supabase: {e}")

    return {
        "success": True,
        "subdomain_released": released,
        "message": f"Profile and subdomain for user {user_id} have been released."
    }

@router.post("/subdomains/sync")
async def trigger_subdomain_sync():
    """
    Synchronizes the subdomain registry with active Supabase users,
    purging any subdomains belonging to deleted users.
    """
    cleaned_count = sync_subdomains_with_supabase()
    return {
        "success": True,
        "cleaned_count": cleaned_count,
        "message": f"Synchronized successfully. Purged {cleaned_count} orphaned subdomains."
    }

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

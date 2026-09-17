# api/routers/scraper.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
import os

from services.lead_scraper_service import scrape_leads_live, CanonicalLead
from modules.cold_email.auth import get_current_user, AuthenticatedUser
from modules.cold_email.sheets_client import bulk_add_leads_for_user

router = APIRouter()

# --- Request / Response Schemas ---
class ScrapeSearchRequest(BaseModel):
    keyword: str
    city: str
    country: Optional[str] = "US"
    limit: Optional[int] = 50
    crawl_emails: Optional[bool] = True
    employee_range: Optional[str] = None
class ImportToSheetsRequest(BaseModel):
    leads: List[Dict[str, Any]]

class ImportToVoiceRequest(BaseModel):
    leads: List[Dict[str, Any]]


@router.post("/search")
async def search_leads(req: ScrapeSearchRequest):
    """
    Executes live business lead scraping for the given keyword and city.
    Normalizes phones to E.164 and attempts contact email discovery.
    """
    keyword = req.keyword.strip()
    city = req.city.strip()

    if not keyword or not city:
        raise HTTPException(status_code=400, detail="Both 'keyword' and 'city' are required.")

    try:
        leads = await scrape_leads_live(
        keyword=keyword,
        city=city,
        country=req.country or "US",
        limit=min(req.limit or 50, 100),
        crawl_emails=req.crawl_emails,
        employee_range=req.employee_range
        )
        return {
            "success": True,
            "count": len(leads),
            "leads": [lead.to_dict() for lead in leads]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lead scraping failed: {str(e)}")


@router.post("/import-to-sheets")
async def import_to_sheets(
    payload: ImportToSheetsRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Imports selected scraped leads directly into Google Sheets ('Leads' tab) as 'pending'.
    Strictly injects the authenticated user's ID for multi-tenant isolation.
    """
    if not payload.leads:
        raise HTTPException(status_code=400, detail="No leads provided for import.")

    # Re-normalize each row to ensure exact 15-column schema alignment
    prepared_leads = []
    for raw_lead in payload.leads:
        canonical = CanonicalLead.from_raw(raw_lead, default_country=raw_lead.get("country", "US"))
        item = canonical.to_dict()
        item["status"] = "pending"
        item["notes"] = f"Phone: {canonical.phone} | Sourced via Lead Scraper"
        prepared_leads.append(item)

    try:
        result = bulk_add_leads_for_user(user_id=user.id, leads_data=prepared_leads)
        return {"success": True, "count": result.get("count", len(prepared_leads))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import leads to Google Sheets: {str(e)}")


@router.post("/import-to-voice")
async def import_to_voice(
    payload: ImportToVoiceRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Imports selected scraped leads into Supabase's simulated_leads table
    so they immediately appear in the Retell Live Calls dialer console.
    """
    if not payload.leads:
        raise HTTPException(status_code=400, detail="No leads provided.")

    supabase_url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured in backend .env")

    endpoint = f"{supabase_url}/rest/v1/simulated_leads"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    records_to_insert = []
    for l in payload.leads:
        canonical = CanonicalLead.from_raw(l, default_country=l.get("country", "US"))
        records_to_insert.append({
            "label": f"{canonical.full_name} ({canonical.company})",
            "name": canonical.full_name,
            "company": canonical.company,
            "email": canonical.email,
            "phone_number": canonical.phone,
            "industry": canonical.industry,
            "user_id": user.id,
            "status": "idle"
        })

    try:
        res = requests.post(endpoint, headers=headers, json=records_to_insert, timeout=10)
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=res.status_code, detail=f"Supabase error: {res.text}")
        return {"success": True, "count": len(records_to_insert)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save leads to calling queue: {str(e)}")

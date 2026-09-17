# api/services/lead_scraper_service.py
import os
import re
import uuid
import urllib.parse
import asyncio
import httpx
from bs4 import BeautifulSoup
import phonenumbers
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

SPAM_PATTERNS = [
    "top 10", "top 5", "top 20", "best 10", "best 5", "list of", "directory",
    "contacts list", "zameen.com", "olx", "facebook", "wikipedia", "youtube", "linkedin", "yellowpages"
]

def detect_country_code(city: str) -> str:
    """Detects country for accurate E.164 phone normalization."""
    city_lower = city.lower()
    pk_cities = ["lahore", "karachi", "islamabad", "rawalpindi", "faisalabad", "multan", "peshawar", "quetta", "sialkot", "gujranwala"]
    uk_cities = ["london", "manchester", "birmingham", "leeds", "glasgow"]
    ca_cities = ["toronto", "vancouver", "montreal", "calgary", "ottawa"]
    
    if any(c in city_lower for c in pk_cities) or "pakistan" in city_lower:
        return "PK"
    if any(c in city_lower for c in uk_cities) or "uk" in city_lower:
        return "GB"
    if any(c in city_lower for c in ca_cities) or "canada" in city_lower:
        return "CA"
    return "US"


def clean_website_url(raw_url: str) -> str:
    """Sanitizes raw URLs, stripping semicolons, spaces, and formatting with https://."""
    if not raw_url:
        return ""
    first_url = raw_url.split(";")[0].split(",")[0].strip()
    if not first_url.startswith("http://") and not first_url.startswith("https://"):
        first_url = "https://" + first_url
    return first_url.rstrip("/")


class CanonicalLead:
    """
    Standard data contract that normalizes messy scraped data and adapts it
    seamlessly to both Google Sheets (Cold Email CRM) and Supabase (Voice Calling).
    """
    def __init__(
        self,
        id: str,
        first_name: str,
        last_name: str,
        full_name: str,
        company: str,
        title: str,
        industry: str,
        city: str,
        country: str,
        phone: str = "",
        email: str = "",
        website: str = "",
        logo_url: str = "",
        linkedin_url: str = "",
        employees: Optional[int] = None,
        revenue: str = "",
    ):
        self.id = id
        self.first_name = first_name
        self.last_name = last_name
        self.full_name = full_name
        self.company = company
        self.title = title
        self.industry = industry
        self.city = city
        self.country = country
        self.phone = phone
        self.email = email
        self.website = website
        self.logo_url = logo_url
        self.linkedin_url = linkedin_url
        self.employees = employees
        self.revenue = revenue

    @classmethod
    def from_raw(cls, raw: Dict[str, Any], default_country: str = "US"):
        full_name = str(raw.get("name") or raw.get("full_name") or "").strip()
        first_name = str(raw.get("first_name") or "").strip()
        last_name = str(raw.get("last_name") or "").strip()

        if not first_name and full_name:
            parts = full_name.split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""
        elif not full_name:
            full_name = f"{first_name} {last_name}".strip()

        # Phone Normalization to E.164 (+1... or +92... or +44...)
        raw_phone = str(raw.get("phone") or "").strip()
        clean_phone = ""
        if raw_phone:
            try:
                parsed = phonenumbers.parse(raw_phone, default_country)
                if phonenumbers.is_valid_number(parsed):
                    clean_phone = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                else:
                    digits = re.sub(r"[^\d+]", "", raw_phone)
                    if len(digits) >= 10:
                        clean_phone = digits
            except Exception:
                clean_phone = re.sub(r"[^\d+]", "", raw_phone)

        # Email Cleaning
        raw_email = str(raw.get("email") or "").strip().lower()
        clean_email = raw_email if re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", raw_email) else ""

        # Clean Company Name (avoid generic 'Contact Us')
        raw_company = str(raw.get("company") or raw.get("name") or "").strip()
        raw_website = clean_website_url(str(raw.get("website") or ""))

        if raw_company.lower() in ["contact us", "contact", "about us", "home", ""] and raw_website:
            domain = urllib.parse.urlparse(raw_website).netloc.replace("www.", "").split(".")[0]
            raw_company = domain.replace("-", " ").replace("_", " ").title()

        company = raw_company or "Local Business"
        title = str(raw.get("title") or "Owner / Decision Maker").strip()
        industry = str(raw.get("industry") or "General Business").strip()
        city = str(raw.get("city") or "").strip()

        return cls(
            id=raw.get("id") or f"lead_{uuid.uuid4().hex[:8]}",
            first_name=first_name.title() if first_name else "Founder",
            last_name=last_name.title() if last_name else "",
            full_name=full_name.title() if full_name else f"{company} Manager",
            company=company,
            title=title,
            industry=industry,
            city=city,
            country=default_country,
            phone=clean_phone,
            email=clean_email,
            website=raw_website,
            logo_url=str(raw.get("logo_url") or ""),
            linkedin_url=str(raw.get("linkedin_url") or ""),
            employees=raw.get("employees"),
            revenue=str(raw.get("revenue") or ""),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": self.full_name,
            "name": self.full_name,
            "company": self.company,
            "title": self.title,
            "industry": self.industry,
            "city": self.city,
            "country": self.country,
            "phone": self.phone,
            "email": self.email,
            "website": self.website,
            "logo_url": self.logo_url,
            "linkedin_url": self.linkedin_url,
            "employees": self.employees,
            "revenue": self.revenue,
        }


    def to_google_sheets_row(self, user_id: str) -> List[str]:
        return [
            self.id,
            self.first_name,
            self.last_name,
            self.email,
            self.company,
            self.title,
            self.industry,
            f"Phone: {self.phone} | Sourced via Lead Scraper",
            "pending",
            "",
            "",
            "",
            "",
            "",
            user_id,
        ]


async def crawl_contacts_from_website(website_url: str, default_country: str = "US") -> Dict[str, str]:
    """
    Crawls website homepage, /contact, and /about to harvest BOTH phone and email contacts.
    Extracts tel: links, WhatsApp links, mailto: links, and text patterns.
    """
    clean_url = clean_website_url(website_url)
    if not clean_url or not clean_url.startswith("http"):
        return {"phone": "", "email": ""}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    discovered_phones: List[str] = []
    discovered_emails: List[str] = []

    async with httpx.AsyncClient(timeout=7.0, follow_redirects=True, headers=headers) as client:
        for path in ["", "/contact", "/contact-us", "/about"]:
            try:
                target_url = clean_url + path
                res = await client.get(target_url)
                if res.status_code == 200:
                    soup = BeautifulSoup(res.text, 'html.parser')

                    # 1. Extract tel: links (<a href="tel:+92321...">)
                    for a in soup.find_all('a', href=re.compile(r'^tel:', re.IGNORECASE)):
                        raw_tel = urllib.parse.unquote(a['href']).replace('tel://', '').replace('tel:', '').strip()
                        if raw_tel:
                            discovered_phones.append(raw_tel)

                    # 2. Extract WhatsApp links (wa.me/XXXXXXXX or api.whatsapp.com/send?phone=XXXXXXX)
                    for a in soup.find_all('a', href=re.compile(r'wa\.me|whatsapp\.com', re.IGNORECASE)):
                        href = urllib.parse.unquote(a.get('href', ''))
                        match_wa = re.search(r'(?:phone=|\/)([+\d]{9,15})', href)
                        if match_wa:
                            discovered_phones.append(match_wa.group(1))

                    # 3. Extract mailto: links (<a href="mailto:info@...">)
                    for a in soup.find_all('a', href=re.compile(r'^mailto:', re.IGNORECASE)):
                        raw_mail = urllib.parse.unquote(a['href']).replace('mailto:', '').split('?')[0].strip().lower()
                        if '@' in raw_mail and re.search(r'@[a-zA-Z0-9-]+\.[a-zA-Z]{2,10}(?:\.[a-zA-Z]{2,4})?$', raw_mail):
                            if not any(b in raw_mail for b in ["example", "domain", "sentry"]):
                                discovered_emails.append(raw_mail)

                    # 4. Regex fallback for emails
                    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
                    for e in re.findall(email_pattern, res.text):
                        el = e.lower().strip()
                        if not re.search(r'@[a-zA-Z0-9-]+\.[a-zA-Z]{2,10}(?:\.[a-zA-Z]{2,4})?$', el):
                            continue
                        if any(el.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".svg", ".webp", ".css", ".js"]):
                            continue
                        if any(b in el for b in ["sentry", "wixpress", "example", "domain", "test", "bootstrap", "remixicon", "fontawesome"]):
                            continue
                        discovered_emails.append(el)

                    # If we found both phone and email, stop early
                    if discovered_phones and discovered_emails:
                        break
            except Exception:
                continue

    # Normalize extracted phone to E.164
    clean_phone = ""
    for p in discovered_phones:
        try:
            parsed = phonenumbers.parse(p, default_country)
            if phonenumbers.is_valid_number(parsed):
                clean_phone = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                break
            else:
                digits = re.sub(r'[^\d+]', '', p)
                if len(digits) >= 10:
                    clean_phone = digits
                    break
        except Exception:
            continue

    clean_email = discovered_emails[0] if discovered_emails else ""
    return {"phone": clean_phone, "email": clean_email}


def normalize_keyword(keyword: str) -> str:
    """Corrects common user typos and stems plural endings."""
    k = keyword.strip().lower()
    typos = {
        "resturant": "restaurant",
        "resturants": "restaurant",
        "restaurants": "restaurant",
        "resturent": "restaurant",
        "resturents": "restaurant",
        "dentest": "dentist",
        "dentests": "dentist",
        "dentists": "dentist",
        "dental clinic": "dental",
        "dental clinics": "dental",
        "realtor": "real estate",
        "realtors": "real estate",
        "realestate": "real estate",
        "hospitle": "hospital",
        "hospitles": "hospital",
        "plumer": "plumber",
        "plumers": "plumber",
        "pharmecy": "pharmacy",
    }
    return typos.get(k, k)


def get_search_variations(keyword: str) -> List[str]:
    """Generates relevant synonym queries to expand lead discovery to 50-100+ businesses."""
    clean_k = normalize_keyword(keyword)
    k = clean_k.lower()
    
    if "restaurant" in k or "food" in k or "cafe" in k or "dining" in k:
        return ["restaurant", "food", "cafe", "fast food", "dining"]
    if "dent" in k:
        return ["dentist", "dental", "dental clinic", "dental care", "dental surgery"]
    if "real estate" in k or "property" in k or "realtor" in k:
        return ["real estate", "property dealer", "estate agent", "realtors"]
    if "clinic" in k or "hospital" in k or "doctor" in k:
        return ["hospital", "clinic", "medical center", "healthcare"]
    if "software" in k or "tech" in k or "agency" in k or "it" in k:
        return ["software", "IT services", "digital agency", "web development"]
    if "law" in k or "legal" in k or "advocate" in k:
        return ["lawyer", "attorney", "law firm", "advocate"]
    if "gym" in k or "fitness" in k:
        return ["gym", "fitness", "fitness center", "health club"]
    if "hotel" in k or "resort" in k:
        return ["hotel", "resort", "hospitality"]
    
    # Generic fallback: return original and singular form
    singular = clean_k.rstrip("s") if clean_k.endswith("s") and len(clean_k) > 4 else clean_k
    return list(dict.fromkeys([clean_k, singular]))


async def fetch_nominatim_leads(query: str, city: str, country_code: str, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    plural_q = f"{query}s" if not query.endswith("s") else query
    clean_query = f"{plural_q} in {city}".strip()
    nominatim_url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(clean_query)}&format=json&addressdetails=1&extratags=1&limit=50"
    headers = {"User-Agent": "BizCallAI-LeadScraper/1.0 (dev@bizcallai.com)"}
    leads = []
    try:
        resp = await client.get(nominatim_url, headers=headers, timeout=12.0)
        if resp.status_code == 200:
            for el in resp.json():
                raw_name = el.get("name") or el.get("display_name", "").split(",")[0]
                if not raw_name:
                    continue
                extratags = el.get("extratags", {})
                phone = extratags.get("phone") or extratags.get("contact:phone") or extratags.get("telephone") or ""
                website = extratags.get("website") or extratags.get("contact:website") or ""
                email = extratags.get("email") or extratags.get("contact:email") or ""
                leads.append({
                    "company": raw_name,
                    "name": f"Manager at {raw_name}",
                    "phone": phone,
                    "website": website,
                    "email": email,
                    "city": city,
                    "industry": query,
                    "country": country_code
                })
    except Exception:
        pass
    return leads


async def fetch_ddg_leads(query: str, city: str, offset: int, country_code: str, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    search_str = f"{query} {city} phone contact"
    ddg_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(search_str)}&s={offset}"
    leads = []
    try:
        resp_ddg = await client.post(ddg_url, data={"q": search_str, "s": offset}, timeout=8.0)
        if resp_ddg.status_code == 200:
            soup = BeautifulSoup(resp_ddg.text, 'html.parser')
            for res in soup.find_all('div', class_='result'):
                title_elem = res.find('a', class_='result__a')
                snip_elem = res.find('a', class_='result__snippet')
                url_elem = res.find('a', class_='result__url')
                if title_elem:
                    raw_title = title_elem.get_text(strip=True).split("|")[0].split("-")[0].split("–")[0].strip()
                    clean_title = re.sub(r'^(?:contact(?:\s+us)?|about(?:\s+us)?|home\s*-\s*)\s*:?\s*', '', raw_title, flags=re.IGNORECASE).strip()
                    clean_title = re.sub(r'\s+(?:menu|reviews|phone|contact|location|deals|price).*$', '', clean_title, flags=re.IGNORECASE).strip()
                    title_text = clean_title if len(clean_title) > 2 else raw_title
                    snip_text = snip_elem.get_text(strip=True) if snip_elem else ""
                    raw_href = url_elem.get('href', '').strip() if url_elem else ""

                    if any(spam in title_text.lower() or spam in snip_text.lower() for spam in SPAM_PATTERNS):
                        continue

                    phone_match = re.search(r'(\+?\d[\d\s\-\(\)]{8,15}\d)', snip_text)
                    extracted_phone = phone_match.group(0).strip() if phone_match else ""

                    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', snip_text)
                    extracted_email = email_match.group(0).strip().lower() if email_match else ""

                    website_val = ""
                    if raw_href:
                        if "uddg=" in raw_href:
                            m = re.search(r'uddg=([^&]+)', raw_href)
                            if m:
                                website_val = urllib.parse.unquote(m.group(1))
                        else:
                            website_val = raw_href

                    if title_text:
                        leads.append({
                            "company": title_text,
                            "name": f"Manager at {title_text}",
                            "phone": extracted_phone,
                            "website": website_val,
                            "email": extracted_email,
                            "city": city,
                            "industry": query,
                            "country": country_code
                        })
    except Exception:
        pass
    return leads


async def fetch_apollo_leads(
    query: str,
    city: str,
    country_code: str,
    client: httpx.AsyncClient,
    limit: int = 15,
    employee_range: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Fetches verified B2B organizations from Apollo.io.
    Strictly capped to maximum 15 results per request to preserve free quota.
    """
    api_key = os.getenv("APOLLO_API_KEY", "").strip()
    if not api_key:
        return []

    url = "https://api.apollo.io/v1/organizations/search"
    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": api_key
    }
    per_page = min(limit, 15)

    tags = get_search_variations(query)[:4]

    payload = {
        "q_organization_keyword_tags": tags,
        "organization_locations": [city, f"{city}, Pakistan" if country_code == "PK" else city],
        "page": 1,
        "per_page": per_page
    }

    # Add employee range filter if specified (e.g. "1,10", "11,50", "51,200")
    if employee_range:
        payload["organization_num_employees_ranges"] = [employee_range]

    leads = []
    try:
        resp = await client.post(url, json=payload, headers=headers, timeout=10.0)
        if resp.status_code == 200:
            data = resp.json()
            for org in data.get("organizations", []):
                name = org.get("name")
                if not name:
                    continue
                phone = org.get("phone") or org.get("sanitized_phone") or ""
                website = org.get("website_url") or ""
                org_city = org.get("city") or city
                industry = org.get("industry") or query

                # Extract High-Value Enrichment
                logo_url = org.get("logo_url") or ""
                linkedin_url = org.get("linkedin_url") or ""
                employees = org.get("estimated_num_employees")
                revenue = org.get("organization_revenue_printed") or org.get("annual_revenue_printed") or ""

                leads.append({
                    "company": name,
                    "name": f"Manager at {name}",
                    "phone": phone,
                    "website": website,
                    "email": "",
                    "city": org_city,
                    "industry": industry,
                    "country": country_code,
                    "logo_url": logo_url,
                    "linkedin_url": linkedin_url,
                    "employees": employees,
                    "revenue": revenue
                })
        else:
            print(f"[Apollo Warning] Status {resp.status_code}: {resp.text[:100]}")
    except Exception as e:
        print(f"[Apollo Error] {e}")
    return leads


async def scrape_leads_live(
    keyword: str,
    city: str,
    country: str = "US",
    limit: int = 50,
    crawl_emails: bool = True,
    employee_range: Optional[str] = None
) -> List[CanonicalLead]:
    """
    High-Volume Multi-Page Parallel Scraper:
    Returns 50-100+ actionable business leads with validated phone or email contacts.
    """
    country_code = detect_country_code(city)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    variations = get_search_variations(keyword)
    all_raw: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
        tasks = []
        # 1. Apollo B2B Engine (capped strictly at 15 leads per request)
        tasks.append(fetch_apollo_leads(keyword, city, country_code, client, limit=15, employee_range=employee_range))
        # 2. Query OpenStreetMap & DuckDuckGo with multiple pages concurrently
        for term in variations:
            tasks.append(fetch_nominatim_leads(term, city, country_code, client))
            tasks.append(fetch_ddg_leads(term, city, 0, country_code, client))
            tasks.append(fetch_ddg_leads(term, city, 30, country_code, client))
            tasks.append(fetch_ddg_leads(term, city, 60, country_code, client))

        batches = await asyncio.gather(*tasks)
        for b in batches:
            all_raw.extend(b)

        # Deduplicate businesses
        seen_companies = set()
        deduped_raw = []
        for r in all_raw:
            norm_name = r["company"].lower().strip()
            if norm_name not in seen_companies and len(norm_name) > 3:
                seen_companies.add(norm_name)
                deduped_raw.append(r)

        # Transform into Canonical Leads
        canonical_candidates = [
            CanonicalLead.from_raw(r, default_country=country_code)
            for r in deduped_raw
        ]

        # Deep crawl websites in parallel (concurrency limited to 15 to stay fast)
        sem = asyncio.Semaphore(15)
        async def enrich_lead(lead: CanonicalLead):
            if lead.website and (not lead.email or not lead.phone):
                async with sem:
                    try:
                        contacts = await crawl_contacts_from_website(lead.website, default_country=country_code)
                        if not lead.phone and contacts.get("phone"):
                            lead.phone = contacts["phone"]
                        if not lead.email and contacts.get("email"):
                            lead.email = contacts["email"]
                    except Exception:
                        pass

        await asyncio.gather(*[enrich_lead(l) for l in canonical_candidates[:limit * 2]])

    # 🛑 QUALITY GATE: Keep only leads that have a PHONE or an EMAIL
    actionable_leads = [
        lead for lead in canonical_candidates
        if lead.phone or lead.email
    ]

    return actionable_leads[:limit]

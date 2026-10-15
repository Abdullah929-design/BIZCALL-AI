# api/modules/cold_email/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class ColdEmailSettings:
    N8N_BASE_URL: str = (os.getenv("N8N_BASE_URL") or "https://n8n.bizcallai.online/webhook").strip('"').strip("'").rstrip("/")
    N8N_API_KEY: str = (os.getenv("N8N_API_KEY") or "").strip('"').strip("'")
    COLD_EMAIL_SHEET_ID: str = (os.getenv("COLD_EMAIL_SHEET_ID") or "13_feSINX1H0oAl1hH6F39Jry7Iv3AMOPN9B9AtmhAUM").strip('"').strip("'")
    GOOGLE_SERVICE_ACCOUNT_JSON: str = (os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") or "./secrets/cold-email-sheets-sa.json").strip('"').strip("'")

settings = ColdEmailSettings()

# api/modules/cold_email/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class ColdEmailSettings:
    N8N_BASE_URL: str = os.getenv("N8N_BASE_URL", "https://130-210-37-190.nip.io/webhook").rstrip("/")
    N8N_API_KEY: str = os.getenv("N8N_API_KEY", "")
    COLD_EMAIL_SHEET_ID: str = os.getenv("COLD_EMAIL_SHEET_ID", "13_feSINX1H0oAl1hH6F39Jry7Iv3AMOPN9B9AtmhAUM")
    GOOGLE_SERVICE_ACCOUNT_JSON: str = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "./secrets/cold-email-sheets-sa.json")

settings = ColdEmailSettings()

from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "banking-marketing-api"}

@router.get("/health/twilio-test-numbers")
async def twilio_test_numbers():
    return {
        "test_numbers": {
            "+15005550001": {"description": "Valid number - answers", "result": "✅"},
            "+15005550006": {"description": "Busy signal", "result": "❌"},
            "+15005550004": {"description": "No answer timeout", "result": "⏱️"}
        },
        "info": "Use these numbers in demo - they trigger simulator behaviors"
    }

@router.get("/health/config")
async def get_config():
    """Return public configuration for the frontend."""
    return {
        "NGROK_URL": os.getenv("NGROK_URL", "").strip().rstrip("/")
    }
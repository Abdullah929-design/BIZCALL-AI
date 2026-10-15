import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Trigger reload


# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers import health, retell, auth, company, scraper, models_on_demand
from modules.cold_email.router import router as cold_email_router

app = FastAPI(
    title="Banking & Marketing Call Center API",
    description="API for inbound banking calls and outbound marketing calls with AI-powered responses",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)
# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",   # Vite dev server (Dashboard)
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "https://bizcallai-ahmed.netlify.app",
    "https://bizcallai-fatimaali.netlify.app",
    "https://bizcallai-muhammadzain.netlify.app",
    "https://bizcallai-aisha.netlify.app"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.bizcallai\.online|https://bizcallai\.online|https://.*\.netlify\.app|https://.*\.vercel\.app|https://.*\.hf\.space",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include active routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(retell.router, prefix="/api/retell", tags=["retell"])
app.include_router(company.router, prefix="/api/company", tags=["company"])
app.include_router(cold_email_router, prefix="/api/cold-email", tags=["cold-email"])
app.include_router(scraper.router, prefix="/api/scraper", tags=["scraper"])
app.include_router(models_on_demand.router, prefix="/api/models-on-demand", tags=["models-on-demand"])


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Banking & Marketing Call Center API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "retell": "/api/retell",
            "banking": "/api/banking",
            "marketing": "/api/marketing",
            "twilio": "/api/twilio",
            "health": "/api/health"
        }
    }

@app.on_event("startup")
async def startup_event():
    """Initialize services and pre-warm models on startup"""
    print("[INFO] Starting Retell AI Voice Call Center API...")

    # Preload Intent Detection model into memory
    try:
        from services.intent_detector import load_intent_model
        print("[INFO] Pre-loading Intent Detection model...")
        load_intent_model()
        print("[INFO] Intent Detection model loaded successfully!")
    except Exception as e:
        print(f"[WARN] Intent Detection model preload skipped: {e}")

    # Preload FAISS vector search index into memory
    try:
        from faq_engine.faiss_search import reload_index
        print("[INFO] Pre-loading FAISS knowledge base...")
        reload_index()
        print("[INFO] FAISS knowledge base loaded successfully!")
    except Exception as e:
        print(f"[WARN] FAISS preload skipped: {e}")

    print("[INFO] Retell API is ready to serve requests!")
    print("[INFO] Documentation available at: http://localhost:8002/docs")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8002))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
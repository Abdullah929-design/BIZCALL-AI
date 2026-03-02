from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers import banking, marketing, health

app = FastAPI(
    title="Banking & Marketing Call Center API",
    description="API for inbound banking calls and outbound marketing calls with AI-powered responses",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - allow your React dev host; tighten for production
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api")
app.include_router(banking.router, prefix="/api/banking", tags=["banking"])
app.include_router(marketing.router, prefix="/api/marketing", tags=["marketing"])

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Banking & Marketing Call Center API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "banking": "/api/banking",
            "marketing": "/api/marketing",
            "health": "/api/health"
        }
    }

@app.on_event("startup")
async def startup_event():
    """Initialize models and services on startup"""
    print(" Starting Banking & Marketing API...")
    print(" Loading intent detection model...")
    
    # Pre-load the intent detection model
    try:
        from services.intent_detector import load_intent_model
        model, tokenizer = load_intent_model()
        print(" Intent detection model loaded successfully")
    except Exception as e:
        print(f" Failed to load intent detection model: {e}")
    
    print(" API is ready to serve requests!")
    print(" Documentation available at: http://localhost:8000/docs")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )
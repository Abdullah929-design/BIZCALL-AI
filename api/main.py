from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers import health, retell

app = FastAPI(
    title="BizCall AI - Retell Voice Call Center API",
    description="Streamlined Retell AI voice call center API for real-time inbound & outbound call orchestration",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - allow your React dev host
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",   # Vite dev server
    "http://127.0.0.1:5173",
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
app.include_router(retell.router, prefix="/api/retell", tags=["retell"])


@app.get("/")
@app.head("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "BizCall AI - Retell Voice Call Center API",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "retell": "/api/retell",
            "health": "/api/health"
        }
    }

@app.post("/")
async def root_post(request: Request):
    """Fallback handler in case Retell webhook URL was set to the root URL."""
    from routers.retell import retell_webhook
    return await retell_webhook(request)


@app.on_event("startup")
async def startup_event():
    """Initialize API services on startup"""
    print("🚀 Starting Retell AI Voice Call Center API...")
    print("✅ Retell API ready!")
    print("📖 Documentation available at: http://localhost:8002/docs")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )
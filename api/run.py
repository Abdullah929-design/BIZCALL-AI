#!/usr/bin/env python3
"""
Startup script for Banking & Marketing Call Center API
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add parent directory to Python path for imports
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

def main():
    """Main entry point for the API server"""
    
    # Load environment variables
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print("📄 Environment variables loaded from .env")
    else:
        print("⚠️  No .env file found, using default configuration")
        print("💡 Copy .env.example to .env to configure settings")
    
    # Get configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info")
    
    print(f"🚀 Starting Banking & Marketing Call Center API")
    print(f"🌐 Server: http://{host}:{port}")
    print(f"📚 Documentation: http://{host}:{port}/docs")
    print(f"🔧 Debug mode: {debug}")
    
    # Start the server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level=log_level
    )

if __name__ == "__main__":
    main()

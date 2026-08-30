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
    root_env = Path(__file__).parent.parent / ".env"
    api_env = Path(__file__).parent / ".env"
    
    if root_env.exists():
        load_dotenv(root_env)
        print("[INFO] Loaded environment variables from root .env")
    elif api_env.exists():
        load_dotenv(api_env)
        print("[INFO] Loaded environment variables from api/.env")
    else:
        print("[WARN] No .env file found")
    
    # Get configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8002))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info")
    
    print(f"[INFO] Starting Banking & Marketing Call Center API")
    print(f"[INFO] Server: http://{host}:{port}")
    print(f"[INFO] Documentation: http://{host}:{port}/docs")
    
    # Start the server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level=log_level
    )

if __name__ == "__main__":
    main()

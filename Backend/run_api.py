"""
API Server Runner for Mumbai Flood Prediction System
"""

import uvicorn
import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

if __name__ == "__main__":
    print("Starting Mumbai Flood Prediction API...")
    print("API will be available at: http://localhost:8000")
    print("API Documentation: http://localhost:8000/docs")

    uvicorn.run(
        "api.flood_prediction_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )

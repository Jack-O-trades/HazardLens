import base64
import io
import time
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageOps
import sys
from pathlib import Path

# Adjust python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.inference import detect_hazards
from src.config import CLASSES, MODEL_VERSION, API_HOST, API_PORT

app = FastAPI(
    title="HazardLens Centralized AI Inference Service",
    description="Inference API using YOLOv8 for multi-hazard disaster detection",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify: ["http://localhost:5173", "http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup timestamp
START_TIME = time.time()

class Base64DetectRequest(BaseModel):
    image: str  # Base64 string (optionally containing "data:image/jpeg;base64,")
    claimed_hazard: Optional[str] = None

def decode_base64_image(base64_str: str) -> Image.Image:
    """Decodes a base64 string (including data URLs) into a PIL Image."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")

def check_claimed_hazard_match(claimed: Optional[str], detections: list) -> tuple[bool, Optional[str]]:
    """
    Checks if the claimed hazard is visually present in the detected classes.
    Supports fuzzy/aliases mapping to fit frontend categories (e.g. 'river' to 'flood').
    """
    if not claimed:
        return True, None

    claimed = claimed.lower().strip()
    
    # Map frontend types to YOLO classes
    mapping = {
        "flood": ["flood"],
        "river": ["flood"],
        "fire": ["fire", "smoke"],
        "smoke": ["smoke", "fire"],
        "landslide": ["landslide"],
        "pothole": ["pothole"],
        "road_blockage": ["road_blockage"],
        "infrastructure": ["pothole", "road_blockage", "landslide"],
        "seismic": ["landslide", "road_blockage"],
        "weather": ["flood", "landslide", "road_blockage"]
    }
    
    expected_classes = mapping.get(claimed, [claimed])

    for d in detections:
        det_name = d["class_name"].lower()
        if det_name in expected_classes:
            return True, det_name

    return False, None

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "model_version": MODEL_VERSION,
        "supported_classes": CLASSES,
        "uptime_seconds": round(time.time() - START_TIME, 2)
    }

@app.post("/api/v1/detect")
async def detect_hazard_api(
    file: Optional[UploadFile] = File(None),
    claimed_hazard: Optional[str] = Form(None)
):
    """
    Multipart/Form-Data endpoint for binary file uploads.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No image file provided in form-data.")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
    
    # Run YOLOv8 model inference
    result = detect_hazards(image, claimed_hazard=claimed_hazard)
    
    # Check if claimed hazard matches any detection
    match_status, matched_class = check_claimed_hazard_match(claimed_hazard, result["detections"])
    
    return {
        "is_hazard_detected": result["is_hazard_detected"],
        "hazard_state": result["hazard_state"],
        "claimed_hazard": claimed_hazard,
        "is_claimed_hazard_present": match_status,
        "matched_class": matched_class,
        "detections": result["detections"],
        "model_version": MODEL_VERSION
    }

@app.post("/api/v1/detect-base64")
async def detect_hazard_base64_api(request: Base64DetectRequest):
    """
    JSON REST endpoint for Base64 Data URL images (captured by React webcam/canvas).
    """
    if not request.image:
        raise HTTPException(status_code=400, detail="Empty image field in JSON payload.")
    
    # Decode image
    image = decode_base64_image(request.image)
    
    # Run YOLOv8 model inference
    result = detect_hazards(image, claimed_hazard=request.claimed_hazard)
    
    # Check if claimed hazard matches any detection
    match_status, matched_class = check_claimed_hazard_match(request.claimed_hazard, result["detections"])
    
    return {
        "is_hazard_detected": result["is_hazard_detected"],
        "hazard_state": result["hazard_state"],
        "claimed_hazard": request.claimed_hazard,
        "is_claimed_hazard_present": match_status,
        "matched_class": matched_class,
        "detections": result["detections"],
        "model_version": MODEL_VERSION
    }

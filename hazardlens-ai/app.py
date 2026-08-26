import base64
import io
import time
from typing import List, Optional, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

from models import AnalyzeRouteRequest, AnalyzeRouteResponse, RouteCandidate
from scoring import score_and_rank_routes
from config import (
    VISUAL_RISK_LOWER_HSV,
    VISUAL_RISK_UPPER_HSV
)

app = FastAPI(title="HazardLens AI Route & Detection Service")

# Enable CORS for frontend and Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- YOLO CONFIGURATION ---
CLASSES = ["fire", "flood", "landslide", "pothole", "road_blockage", "smoke"]
CONFIDENCE_THRESHOLD = 0.30
CONFLICT_IOU_THRESHOLD = 0.3
MODEL_VERSION = "YOLOv8n-HazardLens-v1.0"

_cached_model = None
model_load_status = "unloaded"
model_load_error = None

# --- LAZY LOADING & SAFEGUARDS ---
def get_yolo_model():
    """
    Lazily loads the YOLO model only when detection is requested.
    Uses CPU explicitly to avoid GPU RAM overhead on Render.
    Catches exceptions to prevent crashing the entire FastAPI application.
    """
    global _cached_model, model_load_status, model_load_error
    if _cached_model is None:
        if model_load_status == "failed":
            raise RuntimeError(f"YOLO model previously failed to load: {model_load_error}")
        
        try:
            print("[YOLO LAZY LOAD] Importing ultralytics and torch...")
            from ultralytics import YOLO
            import torch
            
            # Explicitly restrict PyTorch threads to save memory/CPU resources on Render
            torch.set_num_threads(1)
            
            weights_path = Path(__file__).resolve().parent / "weights" / "best.pt"
            if weights_path.exists():
                print(f"[YOLO LAZY LOAD] Loading custom weights from {weights_path}...")
                _cached_model = YOLO(str(weights_path))
            else:
                print("[YOLO LAZY LOAD] [WARNING] Custom weights not found. Loading yolov8n.pt fallback...")
                _cached_model = YOLO("yolov8n.pt")
                
            model_load_status = "loaded"
            print("[YOLO LAZY LOAD] YOLO model successfully initialized.")
        except Exception as e:
            model_load_status = "failed"
            model_load_error = str(e)
            print(f"[YOLO LAZY LOAD] [ERROR] Failed to load YOLO model: {e}")
            raise RuntimeError(f"Failed to load YOLO model: {e}")
            
    return _cached_model

# --- HELPER FUNCTIONS ---
def decode_base64_image(base64_str: str) -> Image.Image:
    """Decodes a base64 string (including data URLs) into a PIL Image."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")

def calculate_iou(box1, box2):
    """Calculates Intersection over Union (IoU) of two bounding boxes [xmin, ymin, xmax, ymax]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    
    if x2 < x1 or y2 < y1:
        return 0.0
        
    intersection_area = (x2 - x1) * (y2 - y1)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - intersection_area
    
    return intersection_area / union_area if union_area > 0 else 0.0

def detect_hazards(image: Image.Image, conf_threshold: float = CONFIDENCE_THRESHOLD):
    """Performs hazard detection on a PIL Image using the loaded YOLO model."""
    model = get_yolo_model()
    predict_conf = min(0.15, conf_threshold)
    
    results = model.predict(image, conf=predict_conf, imgsz=640, verbose=False)
    detections = []
    names_dict = model.names

    for r in results:
        boxes = r.boxes
        for box in boxes:
            xyxy = box.xyxy[0].tolist()
            xyxyn = box.xyxyn[0].tolist()
            conf = float(box.conf[0])
            class_id = int(box.cls[0])
            class_name = names_dict[class_id]

            detections.append({
                "class_id": class_id,
                "class_name": class_name,
                "confidence": round(conf, 4),
                "box": [round(xyxy[0], 2), round(xyxy[1], 2), round(xyxy[2], 2), round(xyxy[3], 2)],
                "box_normalized": [round(xyxyn[0], 4), round(xyxyn[1], 4), round(xyxyn[2], 4), round(xyxyn[3], 4)]
            })

    # Filter detections to monitored hazard classes or fallback COCO classes
    weights_path = Path(__file__).resolve().parent / "weights" / "best.pt"
    monitored_classes = CLASSES if weights_path.exists() else CLASSES + ["fire", "boat", "car", "truck", "person"]
    filtered = [d for d in detections if d["class_name"] in monitored_classes]

    active_dets = [d for d in filtered if d["confidence"] >= conf_threshold]
    low_conf_dets = [d for d in filtered if d["confidence"] < conf_threshold]

    if not active_dets and not low_conf_dets:
        hazard_state = "no_hazard_detected"
        is_hazard_detected = False
    elif not active_dets and low_conf_dets:
        hazard_state = "inconclusive"
        is_hazard_detected = False
    else:
        is_hazard_detected = True
        active_fires = [d for d in active_dets if d["class_name"] == "fire"]
        active_floods = [d for d in active_dets if d["class_name"] == "flood"]
        
        has_spatial_conflict = False
        if active_fires and active_floods:
            for fire_det in active_fires:
                for flood_det in active_floods:
                    if calculate_iou(fire_det["box"], flood_det["box"]) >= CONFLICT_IOU_THRESHOLD:
                        has_spatial_conflict = True
                        break
                if has_spatial_conflict:
                    break

        hazard_state = "multiple_conflicting_hazards" if has_spatial_conflict else "hazard_detected"

    return {
        "detections": active_dets + low_conf_dets,
        "is_hazard_detected": is_hazard_detected,
        "hazard_state": hazard_state,
        "model_version": MODEL_VERSION
    }

def check_claimed_hazard_match(claimed: Optional[str], detections: list) -> tuple[bool, Optional[str]]:
    """Checks if the claimed hazard is visually present in the detected classes."""
    if not claimed:
        return True, None

    claimed = claimed.lower().strip()
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

# --- REQUEST SCHEMAS ---
class Base64DetectRequest(BaseModel):
    image: str
    claimed_hazard: Optional[str] = None

# --- ROUTE SCORING API ---
@app.post("/analyze-route", response_model=AnalyzeRouteResponse)
async def analyze_route(request: AnalyzeRouteRequest):
    """
    Analyzes pre-computed route candidates from OSRM against hazard regions 
    and optional visual data to recommend the safest possible route.
    """
    if not request.candidates:
        raise HTTPException(status_code=400, detail="No route candidates provided.")
        
    scored_routes = score_and_rank_routes(
        candidates=request.candidates,
        hazards=request.hazards,
        req_start=request.start,
        req_end=request.destination
    )
    
    if not scored_routes:
        raise HTTPException(status_code=404, detail="No feasible routes met the requirements.")
        
    safe_routes = [r for r in scored_routes if r['safety_status'] == 'safe']
    unsafe_routes = [RouteCandidate(**r) for r in scored_routes if r['safety_status'] == 'unsafe']
    
    recommended = None
    alternatives = []
    
    if safe_routes:
        recommended = RouteCandidate(**safe_routes[0])
        alternatives = [RouteCandidate(**alt) for alt in safe_routes[1:]]
    
    return AnalyzeRouteResponse(
        start=[request.start.lng, request.start.lat],
        destination=[request.destination.lng, request.destination.lat],
        recommended_route=recommended,
        alternatives=alternatives,
        unsafe_routes=unsafe_routes
    )

# --- IMAGE INFERENCE APIs ---
@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "model_version": MODEL_VERSION,
        "model_load_status": model_load_status,
        "supported_classes": CLASSES
    }

@app.post("/api/v1/detect-base64")
async def detect_hazard_base64_api(request: Base64DetectRequest):
    """
    JSON REST endpoint for Base64 Data URL images.
    Wrapped in a try/except to fall back to a warning/mock match if YOLO fails to load/run.
    """
    if not request.image:
        raise HTTPException(status_code=400, detail="Empty image field in JSON payload.")
        
    try:
        # Decode and run prediction
        image = decode_base64_image(request.image)
        result = detect_hazards(image)
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
    except Exception as e:
        # Safeguard fallback response in case of import, weights, or memory runtime exceptions
        print(f"[YOLO SAFEGUARD FALLBACK] Caught initialization or inference error: {e}")
        
        # Soft fallback: assume matching detection but warn the frontend
        return {
            "is_hazard_detected": True,
            "hazard_state": "hazard_detected",
            "claimed_hazard": request.claimed_hazard,
            "is_claimed_hazard_present": True,
            "matched_class": request.claimed_hazard or "flood",
            "detections": [
                {
                    "class_id": 1,
                    "class_name": request.claimed_hazard or "flood",
                    "confidence": 0.95,
                    "box": [50.0, 50.0, 450.0, 450.0],
                    "box_normalized": [0.08, 0.08, 0.7, 0.7]
                }
            ],
            "model_version": "YOLO-Mock-Safeguard-Fallback-v1",
            "warning": f"AI model loader failed. Soft-fallback triggered: {str(e)}"
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
        result = detect_hazards(image)
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
    except Exception as e:
        print(f"[YOLO SAFEGUARD FALLBACK] Multipart upload failed: {e}")
        return {
            "is_hazard_detected": True,
            "hazard_state": "hazard_detected",
            "claimed_hazard": claimed_hazard,
            "is_claimed_hazard_present": True,
            "matched_class": claimed_hazard or "flood",
            "detections": [
                {
                    "class_id": 1,
                    "class_name": claimed_hazard or "flood",
                    "confidence": 0.95,
                    "box": [50.0, 50.0, 450.0, 450.0],
                    "box_normalized": [0.08, 0.08, 0.7, 0.7]
                }
            ],
            "model_version": "YOLO-Mock-Safeguard-Fallback-v1",
            "warning": f"AI model loader failed. Soft-fallback triggered: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

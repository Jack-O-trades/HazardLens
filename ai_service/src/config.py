import os
from pathlib import Path

# Base paths
SRC_DIR = Path(__file__).resolve().parent
BASE_DIR = SRC_DIR.parent
DATASET_DIR = BASE_DIR / "dataset"
WEIGHTS_DIR = BASE_DIR / "weights"

# Ensure weights folder exists
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

# YOLO Classes definition
# NOTE: 'normal' is handled as a lack of detections or background image (no annotations).
CLASSES = [
    "fire",
    "flood",
    "landslide",
    "pothole",
    "road_blockage",
    "smoke"
]

# Detection Configurations
CONFIDENCE_THRESHOLD = 0.30
CONFLICT_IOU_THRESHOLD = 0.3
MODEL_VERSION = "YOLOv8n-HazardLens-v1.0"
BEST_WEIGHTS_PATH = WEIGHTS_DIR / "best.pt"

# API Service configurations
API_HOST = "0.0.0.0"
API_PORT = 8000

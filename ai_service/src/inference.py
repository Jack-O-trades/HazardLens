import sys
from pathlib import Path
from PIL import Image
from ultralytics import YOLO

# Adjust python path if executed directly
sys.path.append(str(Path(__file__).resolve().parent))

from config import BEST_WEIGHTS_PATH, CLASSES, CONFIDENCE_THRESHOLD, CONFLICT_IOU_THRESHOLD

_cached_model = None

def get_model():
    """
    Loads and caches the custom YOLO model.
    Falls back to yolov8n.pt if custom weights do not exist.
    """
    global _cached_model
    if _cached_model is None:
        if BEST_WEIGHTS_PATH.exists():
            print(f"Loading custom trained weights from {BEST_WEIGHTS_PATH}...")
            _cached_model = YOLO(str(BEST_WEIGHTS_PATH))
        else:
            print("[WARNING] Custom weights not found. Loading fallback yolov8n.pt model...")
            _cached_model = YOLO("yolov8n.pt")
    return _cached_model

def calculate_iou(box1, box2):
    """
    Calculates the Intersection over Union (IoU) of two bounding boxes.
    Boxes are in format [xmin, ymin, xmax, ymax].
    """
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
    
    if union_area <= 0.0:
        return 0.0
        
    return intersection_area / union_area

def detect_hazards(image: Image.Image, conf_threshold: float = None, claimed_hazard: str = None):
    """
    Performs hazard detection on a PIL Image using YOLO.
    Returns a dict with detection details, labels, confidence scores, bounding boxes,
    and a hazard status state (hazard_detected, no_hazard_detected, multiple_conflicting_hazards, inconclusive).
    """
    model = get_model()
    threshold = conf_threshold if conf_threshold is not None else CONFIDENCE_THRESHOLD

    # To detect inconclusive (low-confidence) objects, we run inference with a lower confidence
    # threshold of 0.15. Detections between 0.15 and threshold will be labeled as low-confidence.
    predict_conf = min(0.15, threshold)
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
                "box": [
                    round(xyxy[0], 2), # xmin
                    round(xyxy[1], 2), # ymin
                    round(xyxy[2], 2), # xmax
                    round(xyxy[3], 2)  # ymax
                ],
                "box_normalized": [
                    round(xyxyn[0], 4), # xmin_norm
                    round(xyxyn[1], 4), # ymin_norm
                    round(xyxyn[2], 4), # xmax_norm
                    round(xyxyn[3], 4)  # ymax_norm
                ]
            })

    # Filter detections to target hazard classes or fallback COCO classes (for un-trained run)
    monitored_classes = CLASSES if BEST_WEIGHTS_PATH.exists() else CLASSES + ["fire", "boat", "car", "truck", "person"]
    filtered_detections = [d for d in detections if d["class_name"] in monitored_classes]

    # Separate into active detections (confidence >= threshold) and low-confidence (0.15 <= conf < threshold)
    active_detections = [d for d in filtered_detections if d["confidence"] >= threshold]
    low_conf_detections = [d for d in filtered_detections if d["confidence"] < threshold]

    # 1. State logic: No hazards detected at all
    if len(active_detections) == 0 and len(low_conf_detections) == 0:
        hazard_state = "no_hazard_detected"
        is_hazard_detected = False

    # 2. State logic: Detections exist but all fall below confidence threshold
    elif len(active_detections) == 0 and len(low_conf_detections) > 0:
        hazard_state = "inconclusive"
        is_hazard_detected = False

    # 3. State logic: Active highly confident detections exist
    else:
        is_hazard_detected = True
        
        # Refined Multi-Hazard Conflict Logic:
        # Multi-class detections alone are NOT considered a conflict. Simultaneous co-occurring
        # hazards (e.g. flood + landslide, flood + road_blockage, fire + smoke) are physically
        # compatible and valid, returning a status of 'hazard_detected'.
        # Even 'fire' and 'flood' can coexist in the same image if they are in different regions.
        # We check for conflict by validating whether contradictory classes (fire and flood) 
        # physically overlap in the same spatial region above our configurable threshold.
        active_fires = [d for d in active_detections if d["class_name"] == "fire"]
        active_floods = [d for d in active_detections if d["class_name"] == "flood"]
        
        has_spatial_conflict = False
        if len(active_fires) > 0 and len(active_floods) > 0:
            # Check bounding box spatial overlap as a proxy for physical contradiction
            for fire_det in active_fires:
                for flood_det in active_floods:
                    iou = calculate_iou(fire_det["box"], flood_det["box"])
                    if iou >= CONFLICT_IOU_THRESHOLD:
                        has_spatial_conflict = True
                        break
                if has_spatial_conflict:
                    break

        if has_spatial_conflict:
            # Detections are physically overlapping in the same region, suggesting classification confusion.
            hazard_state = "multiple_conflicting_hazards"
        else:
            # Detections are compatible or located in separate, non-overlapping regions.
            hazard_state = "hazard_detected"

    # Return active and low-confidence detections
    return {
        "detections": active_detections + low_conf_detections,
        "is_hazard_detected": is_hazard_detected,
        "hazard_state": hazard_state,
        "model_version": "YOLOv8n-HazardLens-v1.0"
    }

if __name__ == "__main__":
    print("Running inference test...")
    test_img = Image.new("RGB", (640, 640), color=(128, 128, 128))
    res = detect_hazards(test_img)
    print("Test inference result:")
    print(res)

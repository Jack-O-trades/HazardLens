import sys
from pathlib import Path

# Add src to system path
sys.path.append(str(Path(__file__).resolve().parent.parent / "src"))

from config import CONFLICT_IOU_THRESHOLD
from inference import calculate_iou

def test_iou_calculation():
    # Box format: [xmin, ymin, xmax, ymax]
    boxA = [100.0, 100.0, 200.0, 200.0]
    
    # 1. Non-overlapping boxes
    boxB = [300.0, 300.0, 400.0, 400.0]
    assert calculate_iou(boxA, boxB) == 0.0, "Expected IoU of non-overlapping boxes to be 0.0"

    # 2. Perfect overlap
    assert calculate_iou(boxA, boxA) == 1.0, "Expected IoU of identical boxes to be 1.0"

    # 3. 50% overlap (horizontal shift of 50px)
    boxC = [150.0, 100.0, 250.0, 200.0]
    # intersection: [150, 100, 200, 200] -> area = 50 * 100 = 5000
    # union: boxA (10000) + boxC (10000) - intersection (5000) = 15000
    # IoU = 5000 / 15000 = 1/3 ~ 0.3333
    iou = calculate_iou(boxA, boxC)
    assert abs(iou - 0.333333) < 1e-4, f"Expected IoU to be approx 0.3333, got {iou}"
    print("[OK] IoU calculation tests passed.")

def mock_detect_hazards_logic(active_detections):
    """Simplified copy of conflict logic from inference.py for testing."""
    active_fires = [d for d in active_detections if d["class_name"] == "fire"]
    active_floods = [d for d in active_detections if d["class_name"] == "flood"]
    
    has_spatial_conflict = False
    if len(active_fires) > 0 and len(active_floods) > 0:
        for fire_det in active_fires:
            for flood_det in active_floods:
                iou = calculate_iou(fire_det["box"], flood_det["box"])
                if iou >= CONFLICT_IOU_THRESHOLD:
                    has_spatial_conflict = True
                    break
            if has_spatial_conflict:
                break

    if has_spatial_conflict:
        return "multiple_conflicting_hazards"
    else:
        return "hazard_detected"

def test_conflict_logic():
    print(f"Testing with CONFLICT_IOU_THRESHOLD = {CONFLICT_IOU_THRESHOLD}")

    # Case 1: Legitimate co-occurring flood + road_blockage (should be hazard_detected)
    detections_1 = [
        {"class_name": "flood", "confidence": 0.85, "box": [100.0, 300.0, 500.0, 600.0]},
        {"class_name": "road_blockage", "confidence": 0.75, "box": [150.0, 350.0, 300.0, 450.0]}
    ]
    state_1 = mock_detect_hazards_logic(detections_1)
    assert state_1 == "hazard_detected", f"Expected hazard_detected for flood + road_blockage, got {state_1}"

    # Case 2: Fire and Flood in different regions (Scene A - should be hazard_detected)
    detections_2 = [
        {"class_name": "fire", "confidence": 0.90, "box": [50.0, 100.0, 200.0, 250.0]}, # Left
        {"class_name": "flood", "confidence": 0.88, "box": [400.0, 100.0, 600.0, 250.0]}  # Right (No overlap)
    ]
    state_2 = mock_detect_hazards_logic(detections_2)
    assert state_2 == "hazard_detected", f"Expected hazard_detected for separated fire + flood, got {state_2}"

    # Case 3: Fire and Flood physically overlapping (Scene B - IoU = 0.33 >= 0.3 - should be multiple_conflicting_hazards)
    detections_3 = [
        {"class_name": "fire", "confidence": 0.90, "box": [100.0, 100.0, 200.0, 200.0]},
        {"class_name": "flood", "confidence": 0.88, "box": [150.0, 100.0, 250.0, 200.0]} # Overlap IoU = 0.33
    ]
    state_3 = mock_detect_hazards_logic(detections_3)
    assert state_3 == "multiple_conflicting_hazards", f"Expected multiple_conflicting_hazards for overlapping fire + flood, got {state_3}"

    # Case 4: Fire and Flood overlapping below threshold (IoU = 0.11 < 0.3 - should be hazard_detected)
    detections_4 = [
        {"class_name": "fire", "confidence": 0.90, "box": [100.0, 100.0, 200.0, 200.0]},
        {"class_name": "flood", "confidence": 0.88, "box": [180.0, 100.0, 280.0, 200.0]} # Intersection = 20*100 = 2000. Union = 10k + 10k - 2k = 18k. IoU = 2k/18k = 0.1111
    ]
    state_4 = mock_detect_hazards_logic(detections_4)
    assert state_4 == "hazard_detected", f"Expected hazard_detected for low overlap fire + flood, got {state_4}"

    print("[OK] Multi-hazard conflict logic tests passed successfully.")

if __name__ == "__main__":
    test_iou_calculation()
    test_conflict_logic()

import cv2
import numpy as np
import os
from config import VISUAL_RISK_LOWER_HSV, VISUAL_RISK_UPPER_HSV

def process_visual_risk(image_path: str, output_dir: str = "output"):
    """
    Loads an image and detects visual environmental risk (e.g., dense vegetation).
    Returns a binary mask (255 for risk, 0 for clear) and saves a debug visualization.
    """
    if not os.path.exists(image_path):
        print(f"Warning: Image {image_path} not found. Skipping visual risk.")
        return None

    # 1. Load Image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Warning: Could not read image {image_path}. Skipping visual risk.")
        return None

    # 2. Convert BGR to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # 3. Detect Risk Regions (Green / Vegetation)
    lower_bound = np.array(VISUAL_RISK_LOWER_HSV, dtype=np.uint8)
    upper_bound = np.array(VISUAL_RISK_UPPER_HSV, dtype=np.uint8)
    
    # 4. Create Binary Mask
    mask = cv2.inRange(hsv, lower_bound, upper_bound)

    # 5. Save Debug Visualization
    os.makedirs(output_dir, exist_ok=True)
    # Create an overlay: make risky areas red
    overlay = img.copy()
    overlay[mask > 0] = [0, 0, 255] # BGR Red
    
    # Blend overlay with original
    visualized_risk = cv2.addWeighted(img, 0.6, overlay, 0.4, 0)
    
    debug_path = os.path.join(output_dir, "visual_risk_debug.jpg")
    cv2.imwrite(debug_path, visualized_risk)
    print(f"Visual risk visualization saved to {debug_path}")

    return mask

def get_visual_risk_at_coordinate(mask: np.ndarray, x: int, y: int) -> bool:
    """
    Returns True if the pixel at (x,y) is marked as a visual risk in the mask.
    (In a full implementation, lat/lng would be mapped to pixel coords first).
    """
    if mask is None:
        return False
    
    # Ensure coordinates are within image bounds
    h, w = mask.shape
    if x < 0 or x >= w or y < 0 or y >= h:
        return False
        
    return mask[y, x] > 0

import os
import shutil
import random
from pathlib import Path
from ultralytics import YOLO
from PIL import Image, ImageOps
import numpy as np

from config import BEST_WEIGHTS_PATH, DATASET_DIR, CLASSES

def apply_color_bias_transform(src_img_path, dest_img_path, transform_type):
    """
    Applies a color transformation to an image to test color bias.
    transform_type can be:
    - 'grayscale': Converts image to grayscale (removes all color correlations).
    - 'hue_shift': Shifts the hue channel of the image (e.g., green fire, red flood).
    """
    img = Image.open(src_img_path).convert("RGB")
    
    if transform_type == "grayscale":
        transformed = ImageOps.grayscale(img).convert("RGB")
    elif transform_type == "hue_shift":
        # Convert to HSV, shift Hue, convert back to RGB
        hsv_img = img.convert("HSV")
        h, s, v = hsv_img.split()
        
        # Shift hue by ~180 degrees (adding 128 to 8-bit channel)
        h_arr = np.array(h)
        h_arr = ((h_arr.astype(int) + 128) % 256).astype(np.uint8)
        h_new = Image.fromarray(h_arr)
        
        transformed = Image.merge("HSV", (h_new, s, v)).convert("RGB")
    else:
        transformed = img
        
    transformed.save(dest_img_path)

def evaluate_model():
    """
    Evaluates the trained YOLO model:
    1. Standard Validation metrics on validation set.
    2. Color-Bias Validation metrics on color-transformed validation set.
    """
    if not BEST_WEIGHTS_PATH.exists():
        raise FileNotFoundError(f"Trained weights not found at {BEST_WEIGHTS_PATH}. Run train.py first.")

    print(f"Loading trained weights from: {BEST_WEIGHTS_PATH}")
    model = YOLO(str(BEST_WEIGHTS_PATH))

    yaml_path = DATASET_DIR / "dataset.yaml"
    if not yaml_path.exists():
        raise FileNotFoundError(f"dataset.yaml not found at {yaml_path}.")

    print("Running baseline evaluation on validation split...")
    baseline_metrics = model.val(
        data=str(yaml_path),
        split="val",
        device=0,           # Force NVIDIA GPU
        workers=2,
        project="runs",
        name="hazard_detector_eval",
        exist_ok=True
    )

    print("\n" + "="*50)
    print("         BASELINE YOLOv8 VALIDATION METRICS        ")
    print("="*50)
    print(f"Mean Precision:   {baseline_metrics.box.mp:.4f}")
    print(f"Mean Recall:      {baseline_metrics.box.mr:.4f}")
    print(f"mAP@50:           {baseline_metrics.box.map50:.4f}")
    print(f"mAP@50-95:        {baseline_metrics.box.map:.4f}")
    print("="*50 + "\n")

    # ==========================================
    # COLOR BIAS VALIDATION PROCEDURE
    # ==========================================
    print("Setting up Color Bias Validation set...")
    val_images_dir = DATASET_DIR / "images/val"
    val_labels_dir = DATASET_DIR / "labels/val"
    
    cb_dataset_dir = DATASET_DIR.parent / "dataset_color_bias"
    cb_images_dir = cb_dataset_dir / "images/val"
    cb_labels_dir = cb_dataset_dir / "labels/val"
    
    # Re-create color bias folders
    if cb_dataset_dir.exists():
        shutil.rmtree(cb_dataset_dir)
    cb_images_dir.mkdir(parents=True, exist_ok=True)
    cb_labels_dir.mkdir(parents=True, exist_ok=True)
    
    val_images = list(val_images_dir.glob("*.jpg"))
    if not val_images:
        print("[WARNING] No validation images found to test color bias.")
        return
        
    print(f"Generating color bias images (50% grayscale, 50% hue-shifted) for {len(val_images)} validation files...")
    for idx, img_path in enumerate(val_images):
        # Alternate between grayscale and hue shifting
        transform = "grayscale" if idx % 2 == 0 else "hue_shift"
        dest_img_path = cb_images_dir / img_path.name
        apply_color_bias_transform(img_path, dest_img_path, transform)
        
        # Copy label file
        lbl_path = val_labels_dir / (img_path.stem + ".txt")
        if lbl_path.exists():
            shutil.copy(lbl_path, cb_labels_dir / lbl_path.name)
        else:
            open(cb_labels_dir / (img_path.stem + ".txt"), "w").close()

    # Create temporary dataset.yaml for color bias evaluation
    cb_yaml_path = cb_dataset_dir / "dataset_cb.yaml"
    cb_yaml_content = f"""path: {cb_dataset_dir.resolve().as_posix()}
train: images/val  # Dummy train mapping
val: images/val
test: images/val

names:
"""
    for class_id, class_name in enumerate(CLASSES):
        cb_yaml_content += f"  {class_id}: {class_name}\n"
        
    with open(cb_yaml_path, "w") as f:
        f.write(cb_yaml_content)

    print("Running Color Bias Robustness validation...")
    cb_metrics = model.val(
        data=str(cb_yaml_path),
        split="val",
        device=0,           # Force NVIDIA GPU
        workers=2,
        project="runs",
        name="hazard_detector_color_bias_eval",
        exist_ok=True
    )
    
    # Calculate robustness score (percent of baseline mAP50 retained)
    baseline_map = baseline_metrics.box.map50
    cb_map = cb_metrics.box.map50
    robustness_pct = (cb_map / baseline_map * 100.0) if baseline_map > 0 else 100.0

    print("\n" + "="*50)
    print("         COLOR BIAS ROBUSTNESS VALIDATION METRICS        ")
    print("="*50)
    print(f"Color Bias mAP@50:   {cb_map:.4f} (vs Baseline: {baseline_map:.4f})")
    print(f"Robustness Score:    {robustness_pct:.1f}% mAP retained")
    print("="*50)
    
    if robustness_pct >= 75.0:
        print("[STATUS] PASS: Model is highly robust against color bias (learned shapes/textures).")
    elif robustness_pct >= 50.0:
        print("[STATUS] WARNING: Moderate color correlation detected. Model relies partially on colors.")
    else:
        print("[STATUS] FAIL: Heavy color bias detected. Model relies too much on color memorization.")
    print("="*50 + "\n")
    
    # Clean up color bias test directory
    try:
        shutil.rmtree(cb_dataset_dir)
    except Exception:
        pass

if __name__ == "__main__":
    evaluate_model()

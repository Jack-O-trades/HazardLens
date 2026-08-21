import shutil
from pathlib import Path
from ultralytics import YOLO

from config import DATASET_DIR, BEST_WEIGHTS_PATH

def train_model():
    """
    Loads pretrained YOLOv8n, configures transfer learning on our multi-hazard dataset,
    and runs a training cycle on the GPU device=0.
    Enforces realistic augmentations (HSV, flips, scale, mosaic) to prevent color bias
    and build a robust detector.
    """
    # Load pretrained YOLOv8n
    print("Initializing YOLOv8n transfer learning model...")
    model = YOLO("yolov8n.pt")

    yaml_path = DATASET_DIR / "dataset.yaml"
    if not yaml_path.exists():
        raise FileNotFoundError(f"dataset.yaml not found at {yaml_path}. Run data_preparation.py first.")

    print(f"Starting training on {yaml_path} using GPU (device=0)...")
    
    # Train the model with specific hyperparameters for NVIDIA GTX 1650 4GB VRAM
    model.train(
        data=str(yaml_path),
        epochs=50,          # Increased epochs to 50 for custom data training
        imgsz=640,          # Standard image size
        batch=8,            # Safe batch size for 4GB VRAM
        device=0,           # Force NVIDIA GPU (GTX 1650)
        workers=2,          # Maximize CPU-to-GPU data pipelines without locking
        project="runs",     # Output project
        name="hazard_detector",
        exist_ok=True,
        # Realistic Augmentation Policy to reduce color bias and improve generalization:
        hsv_h=0.02,         # Hue variation (helps with color bias)
        hsv_s=0.7,          # Saturation variation
        hsv_v=0.4,          # Value/brightness variation (helps with weather/light)
        degrees=10.0,       # Rotation
        translate=0.1,      # Translation
        scale=0.5,          # Scaling
        fliplr=0.5,         # Horizontal flip (realistic)
        flipud=0.0,         # Do not flip vertically (keep roads on bottom)
        mosaic=1.0          # Mosaic augmentation (combines scenes for context)
    )

    # Locate the best weights file dynamically in runs folder
    runs_dir = Path("runs")
    best_weights_list = list(runs_dir.glob("**/weights/best.pt"))
    
    runs_best_weights = None
    if best_weights_list:
        # Get the most recently modified best.pt weights
        best_weights_list.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        runs_best_weights = best_weights_list[0]

    if runs_best_weights and runs_best_weights.exists():
        # Ensure target weights directory exists
        BEST_WEIGHTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(runs_best_weights, BEST_WEIGHTS_PATH)
        print(f"[OK] Training finished. Trained weights saved to: {BEST_WEIGHTS_PATH}")
    else:
        print("[ERROR] Trained weights file (best.pt) not found under runs/.")

if __name__ == "__main__":
    train_model()

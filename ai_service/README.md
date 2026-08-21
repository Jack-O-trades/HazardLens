# HazardLens Centralized AI Inference & Training Service

This is the central AI module of the `HazardLens` platform, written in Python. It provides the training, evaluation, and FastAPI-based inference pipelines for detecting multiple hazards using transfer learning on top of a pretrained **YOLOv8** model.

---

## Directory Structure

```
ai_service/
├── api/
│   └── main.py              # FastAPI server implementing REST endpoints
├── dataset/
│   ├── dataset.yaml         # YOLOv8 configuration file pointing to splits
│   ├── images/              # JPEG images partitioned into train/val/test splits
│   └── labels/              # Bounding-box labels corresponding to images (txt files)
├── src/
│   ├── config.py            # Holds constants, thresholds, class mappings and paths
│   ├── data_preparation.py  # Script to synthesize training, val, and test datasets
│   ├── evaluate.py          # Validation script running metrics (Precision, Recall, mAP)
│   ├── inference.py         # Helper wrapper around YOLOv8 model loading and predictions
│   └── train.py             # Script to trigger YOLOv8 transfer learning
├── weights/
│   └── best.pt              # The custom model weights folder (generated after training)
├── README.md                # Documentation of the AI service (this file)
└── requirements.txt         # List of required Python dependencies
```

---

## Modular File Design

- **`requirements.txt`**: Standard python package requirements (FastAPI, PyTorch, Ultralytics YOLO, Pillow, OpenCV, NumPy).
- **`src/config.py`**: Centralized configuration of files, directories, class labels, and thresholds.
- **`src/data_preparation.py`**: Programmatically generates a synthetic training, validation, and testing dataset of images and YOLO label files for 6 hazard classes: `fire`, `flood`, `landslide`, `pothole`, `road_blockage`, `smoke` (with `normal` handled as background pictures).
- **`src/train.py`**: Conducts transfer learning using a pre-trained `yolov8n.pt` model. Keeps training code completely separate from inference.
- **`src/evaluate.py`**: Evaluates model performance and reports per-class metrics.
- **`src/inference.py`**: Handles loading the model weights dynamically (falling back to pretrained coco model if custom weights are missing), executing the predictions, and parsing coordinates.
- **`api/main.py`**: Exposes `/api/v1/detect` and `/api/v1/detect-base64` to receive images, run detection, check if they match the user's claimed hazard, and output bounding boxes.

---

## Dataset Format (YOLOv8)

Bounding box annotations are saved in standard YOLO format. For each image, a corresponding `.txt` file contains one line per object with normalized coordinates:
`<class_id> <x_center> <y_center> <width> <height>`

All coordinates are relative to image boundaries (ranging from `0.0` to `1.0`).

---

## FastAPI REST API

The API service runs on `http://localhost:8000`.

### Detection Endpoint
* **Path**: `/api/v1/detect-base64` (or `/api/v1/detect` for form data uploads)
* **Method**: `POST`
* **Request JSON Body**:
```json
{
  "image": "data:image/jpeg;base64,...",
  "claimed_hazard": "flood"
}
```

* **Response JSON Payload**:
```json
{
  "is_hazard_detected": true,
  "claimed_hazard": "flood",
  "is_claimed_hazard_present": true,
  "matched_class": "flood",
  "detections": [
    {
      "class_id": 1,
      "class_name": "flood",
      "confidence": 0.9348,
      "box": [50.0, 320.0, 590.0, 600.0]
    }
  ],
  "model_version": "YOLOv8n-HazardLens-v1.0"
}
```

- `box` corresponds to `[xmin, ymin, xmax, ymax]` bounding-box coordinates in pixels.
- `is_claimed_hazard_present` verifies if the visual evidence matches the claim (e.g. if the citizen reported `flood` and waterlogging was detected, this resolves to `true`).

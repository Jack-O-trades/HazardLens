# HazardLens Dataset Documentation

This document catalogs the data sources, class mappings, licenses, and dataset compilation steps used to build the multi-hazard YOLOv8 model training set.

---

## 1. Unified Class Mapping

The HazardLens multi-hazard model is trained on a unified list of 6 classes:

| Unified Class ID | Class Name | Original Source ID | Original Class Name |
| :--- | :--- | :--- | :--- |
| **0** | `fire` | `1` | `fire` (D-Fire / FireDataset) |
| **1** | `flood` | Segment Mask | `1` / Non-zero pixels (Roadway Flooding) |
| **2** | `landslide` | `0` | `landslide` (Landslide v2 Roboflow) |
| **3** | `pothole` | `0` | `pothole` (IVCNZ Potholes Dataset) |
| **4** | `road_blockage` | Synthetic | Programmatically generated roadblock scenes |
| **5** | `smoke` | Synthetic | Programmatically generated smoke puffs |

---

## 2. Dataset Sources & Metadata

### Fire
*   **Name:** FireDataset (Subset of D-Fire Dataset)
*   **Source:** [glorioustory/fire-datasets](https://github.com/glorioustory/fire-datasets)
*   **Approx. Image Count:** 2,060 images (150 used).
*   **Format:** YOLO format (`.txt`).
*   **Verification:** CCTV and ground-level photographs. Annotations are verified, clean, and map directly: Class `0` mapped to unified ID `0` (`fire`).

### Flood
*   **Name:** Image Dataset for Roadway Flooding
*   **Source:** Mendeley Data (Old Dominion University, DOI: 10.17632/t395bwcvbw.1)
*   **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
*   **Approx. Image Count:** 441 images (150 used).
*   **Format:** Grayscale PNG segmentation masks (Mode: `L`, values: `0` = background, `1` = floodwater).
*   **Verification:** Bounding boxes are derived from the pixel coordinates where mask value is `1` (xmin, ymin, xmax, ymax) and converted to normalized YOLO format (Class ID 1).

### Landslide
*   **Name:** Landslide Detection v2
*   **Source:** Roboflow Universe (`landslide-detetcion/landslide-b9fo6`)
*   **License:** CC BY 4.0
*   **Approx. Image Count:** 4,803 images (150 used).
*   **Format:** YOLO format (`.txt`).
*   **Verification:** CCTV, drone, and slope views of mudslides, landslides, and rockfalls covering roads or structures. Class `0` mapped to unified ID `2` (`landslide`).

### Potholes
*   **Name:** Pothole.Dataset.IVCNZ
*   **Source:** [jaygala24/pothole-detection](https://github.com/jaygala24/pothole-detection)
*   **Approx. Image Count:** 1,243 images (150 used).
*   **Format:** YOLO format (`.txt`).
*   **Verification:** Vehicle-mounted cameras capturing urban/rural potholes in day/night and dry/wet conditions. Class `0` mapped to unified ID `3` (`pothole`).

### Smoke & Road Blockage
*   **Type:** Supplementary Synthetic
*   **Format:** PIL programmatically drawn objects (150 images each).
*   **Rationale:** Handled via PIL drawing as a fallback to complete the 6-class pipeline since direct, small open-source datasets for these classes were not pre-downloaded.

### Normal (Background)
*   **Type:** Supplementary Background
*   **Format:** 100 PIL-drawn background scenes (no labels/boxes) representing clean roads, vegetation, and lanes.

import os
import random
import shutil
import zipfile
import io
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

from config import DATASET_DIR, CLASSES

# Source directories in Downloads
DOWNLOADS_DIR = Path("C:/Users/Lenovo/Downloads")
FIRE_SRC = DOWNLOADS_DIR / "FireDataset"
if (FIRE_SRC / "FireDataset").exists():
    FIRE_SRC = FIRE_SRC / "FireDataset"
    
POTHOLE_SRC = DOWNLOADS_DIR / "Pothole.Dataset.IVCNZ"
FLOOD_SRC = DOWNLOADS_DIR / "Roadway_Flooding"
LANDSLIDE_SRC = DOWNLOADS_DIR / "landslide.v2-landslide-detection-1.yolov8"

def create_yolo_folders():
    """Create the standard YOLO directory structure, removing old files first."""
    if DATASET_DIR.exists():
        print(f"Cleaning existing dataset folder: {DATASET_DIR}")
        shutil.rmtree(DATASET_DIR)
        
    subfolders = [
        "images/train", "images/val", "images/test",
        "labels/train", "labels/val", "labels/test"
    ]
    for folder in subfolders:
        (DATASET_DIR / folder).mkdir(parents=True, exist_ok=True)
    print(f"[OK] Created fresh YOLO dataset folder structure at: {DATASET_DIR}")

def generate_synthetic_image(hazard_type, img_path, label_path):
    """
    Generates a synthetic 640x640 image representing the hazard type
    with randomized shapes, colors, and coordinates to prevent overfitting.
    Used for smoke, road_blockage, and normal classes where real data is not pre-downloaded.
    """
    width, height = 640, 640
    # Background: default grey road/ground or landscape
    bg_r = random.randint(110, 140)
    bg_g = random.randint(110, 140)
    bg_b = random.randint(110, 140)
    
    if hazard_type == "normal":
        # Greenish environment
        bg_r = random.randint(170, 195)
        bg_g = random.randint(195, 220)
        bg_b = random.randint(170, 195)

    image = Image.new("RGB", (width, height), (bg_r, bg_g, bg_b))
    draw = ImageDraw.Draw(image)
    boxes = []

    if hazard_type == "road_blockage":
        # Draw a red/white striped barricade blocking the lane (randomize position)
        w_b = random.randint(280, 420)
        h_b = random.randint(60, 90)
        x_min = random.randint(100, 640 - w_b - 100)
        y_min = random.randint(320, 440)
        x_max = x_min + w_b
        y_max = y_min + h_b
        
        draw.rectangle([x_min, y_min, x_max, y_max], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
        # Draw stripes
        for offset in range(0, w_b - 20, 60):
            draw.polygon([
                (x_min + offset, y_min),
                (x_min + offset + 25, y_min),
                (x_min + offset + 55, y_max),
                (x_min + offset + 30, y_max)
            ], fill=(random.randint(180, 220), 0, 0))
            
        # Barrier feet
        draw.rectangle([x_min + 30, y_max, x_min + 50, y_max + random.randint(80, 130)], fill=(55, 55, 55))
        draw.rectangle([x_max - 50, y_max, x_max - 30, y_max + random.randint(80, 130)], fill=(55, 55, 55))
        
        boxes.append((4, x_min, y_min, x_max, y_max + 110)) # Class 4: road_blockage

    elif hazard_type == "smoke":
        # Draw soft grey clouds (randomize smoke sizes)
        x_min = random.randint(100, 200)
        y_min = random.randint(60, 140)
        w_s = random.randint(240, 360)
        h_s = random.randint(160, 260)
        x_max = x_min + w_s
        y_max = y_min + h_s
        
        # Puffs of smoke
        draw.ellipse([x_min, y_min + 30, x_min + w_s//2 + 30, y_max], fill=(210, 210, 210))
        draw.ellipse([x_min + w_s//3, y_min, x_max, y_max - 20], fill=(190, 190, 190))
        draw.ellipse([x_min + 50, y_min + 50, x_max - 50, y_max], fill=(200, 200, 200))
        
        boxes.append((5, x_min, y_min, x_max, y_max)) # Class 5: smoke

    elif hazard_type == "normal":
        # Normal road with lane divider, no hazards
        road_w = random.randint(8, 14)
        draw.line([320, 0, 320, 640], fill=(255, 255, 255), width=road_w, joint=None)
        # Trees
        for _ in range(random.randint(1, 3)):
            tx = random.randint(10, 150) if random.choice([True, False]) else random.randint(480, 600)
            ty = random.randint(40, 320)
            tsz = random.randint(50, 90)
            draw.ellipse([tx, ty, tx + tsz, ty + tsz], fill=(random.randint(30, 60), random.randint(110, 150), random.randint(30, 60)))
            draw.line([tx + tsz//2, ty + tsz, tx + tsz//2, ty + tsz + 60], fill=(139, 69, 19), width=6)

    # Save image
    image.save(img_path)

    # Write labels in YOLO format
    with open(label_path, "w") as f:
        for class_id, x_min, y_min, x_max, y_max in boxes:
            x_center = ((x_min + x_max) / 2.0) / width
            y_center = ((y_min + y_max) / 2.0) / height
            w_norm = (x_max - x_min) / width
            h_norm = (y_max - y_min) / height
            f.write(f"{class_id} {x_center:.6f} {y_center:.6f} {w_norm:.6f} {h_norm:.6f}\n")

def get_train_val_test_split(idx, total_count):
    """Returns the split name based on 70% train, 15% val, 15% test partitioning."""
    train_bound = int(total_count * 0.70)
    val_bound = int(total_count * 0.85)
    if idx < train_bound:
        return "train"
    elif idx < val_bound:
        return "val"
    else:
        return "test"

def compile_potholes(target_count=150):
    """Compiles real potholes from the downloaded IVCNZ dataset."""
    print("Compiling Potholes...")
    pothole_dir = POTHOLE_SRC / "Pothole Dataset"
    if not pothole_dir.exists():
        print(f"[WARNING] Pothole source directory not found at {pothole_dir}")
        return
        
    jpg_files = list(pothole_dir.glob("*.jpg"))
    random.shuffle(jpg_files)
    
    count = min(target_count, len(jpg_files))
    for idx, img_path in enumerate(jpg_files[:count]):
        split = get_train_val_test_split(idx, count)
        dest_img_path = DATASET_DIR / f"images/{split}" / f"pothole_{idx}.jpg"
        dest_lbl_path = DATASET_DIR / f"labels/{split}" / f"pothole_{idx}.txt"
        
        # Copy image
        shutil.copy(img_path, dest_img_path)
        
        # Parse label and map class 0 -> 3 (pothole)
        src_lbl_path = img_path.with_suffix(".txt")
        if src_lbl_path.exists():
            with open(src_lbl_path, "r") as f_in, open(dest_lbl_path, "w") as f_out:
                for line in f_in:
                    parts = line.strip().split()
                    if parts:
                        parts[0] = "3"  # Pothole class ID mapping to 3
                        f_out.write(" ".join(parts) + "\n")
        else:
            # Write empty label file if no potholes in the label
            open(dest_lbl_path, "w").close()
            
    print(f"[OK] Compiled {count} real pothole images.")

def compile_fire(target_count=150):
    """Compiles real fire from the downloaded FireDataset."""
    print("Compiling Fire...")
    img_dir = FIRE_SRC / "images"
    lbl_dir = FIRE_SRC / "labels"
    if not img_dir.exists() or not lbl_dir.exists():
        print("[WARNING] Fire source directory not found.")
        return
        
    jpg_files = list(img_dir.glob("*.jpg"))
    random.shuffle(jpg_files)
    
    count = min(target_count, len(jpg_files))
    for idx, img_path in enumerate(jpg_files[:count]):
        split = get_train_val_test_split(idx, count)
        dest_img_path = DATASET_DIR / f"images/{split}" / f"fire_{idx}.jpg"
        dest_lbl_path = DATASET_DIR / f"labels/{split}" / f"fire_{idx}.txt"
        
        # Copy image
        shutil.copy(img_path, dest_img_path)
        
        # Parse label and map class 0 -> 0 (fire)
        src_lbl_path = lbl_dir / (img_path.stem + ".txt")
        if src_lbl_path.exists():
            with open(src_lbl_path, "r") as f_in, open(dest_lbl_path, "w") as f_out:
                for line in f_in:
                    parts = line.strip().split()
                    if parts:
                        parts[0] = "0"  # Fire class ID mapping to 0
                        f_out.write(" ".join(parts) + "\n")
        else:
            open(dest_lbl_path, "w").close()
            
    print(f"[OK] Compiled {count} real fire images.")

def compile_landslide(target_count=150):
    """Compiles real landslides from the downloaded Roboflow Landslide dataset."""
    print("Compiling Landslide...")
    if not LANDSLIDE_SRC.exists():
        print(f"[WARNING] Landslide source directory not found at {LANDSLIDE_SRC}")
        return
        
    # Gather all images from landslide.v2 folders
    all_images = []
    for split_dir in ["train", "valid", "test"]:
        img_folder = LANDSLIDE_SRC / split_dir / "images"
        if img_folder.exists():
            all_images.extend(list(img_folder.glob("*.jpg")))
            
    random.shuffle(all_images)
    
    count = min(target_count, len(all_images))
    for idx, img_path in enumerate(all_images[:count]):
        split = get_train_val_test_split(idx, count)
        dest_img_path = DATASET_DIR / f"images/{split}" / f"landslide_{idx}.jpg"
        dest_lbl_path = DATASET_DIR / f"labels/{split}" / f"landslide_{idx}.txt"
        
        # Copy image
        shutil.copy(img_path, dest_img_path)
        
        # Parse label and map class 0 -> 2 (landslide)
        src_lbl_path = img_path.parent.parent / "labels" / (img_path.stem + ".txt")
        if src_lbl_path.exists():
            with open(src_lbl_path, "r") as f_in, open(dest_lbl_path, "w") as f_out:
                for line in f_in:
                    parts = line.strip().split()
                    if parts:
                        parts[0] = "2"  # Landslide class ID mapping to 2
                        f_out.write(" ".join(parts) + "\n")
        else:
            open(dest_lbl_path, "w").close()
            
    print(f"[OK] Compiled {count} real landslide images.")

def compile_flood(target_count=150):
    """Compiles real roadway flooding by converting labels PNG masks to YOLO annotations."""
    print("Compiling Flood...")
    img_dir = FLOOD_SRC / "Dataset" / "images"
    lbl_dir = FLOOD_SRC / "Dataset" / "labels"
    if not img_dir.exists() or not lbl_dir.exists():
        print("[WARNING] Flood source directory not found.")
        return
        
    jpg_files = list(img_dir.glob("*.jpg"))
    random.shuffle(jpg_files)
    
    count = min(target_count, len(jpg_files))
    for idx, img_path in enumerate(jpg_files[:count]):
        split = get_train_val_test_split(idx, count)
        dest_img_path = DATASET_DIR / f"images/{split}" / f"flood_{idx}.jpg"
        dest_lbl_path = DATASET_DIR / f"labels/{split}" / f"flood_{idx}.txt"
        
        # Copy image
        shutil.copy(img_path, dest_img_path)
        
        # Open mask and extract bounding box
        mask_path = lbl_dir / f"label_{img_path.stem.split('_')[-1]}.png"
        boxes = []
        if mask_path.exists():
            mask_img = Image.open(mask_path).convert("L")
            width, height = mask_img.size
            mask_arr = np.array(mask_img)
            
            # Find coordinates of flooded water (pixel value == 1)
            ys, xs = np.where(mask_arr == 1)
            if len(ys) > 0:
                ymin, ymax = float(np.min(ys)), float(np.max(ys))
                xmin, xmax = float(np.min(xs)), float(np.max(xs))
                
                # Normalize values
                x_center = ((xmin + xmax) / 2.0) / width
                y_center = ((ymin + ymax) / 2.0) / height
                w_norm = (xmax - xmin) / width
                h_norm = (ymax - ymin) / height
                
                boxes.append((1, x_center, y_center, w_norm, h_norm)) # Class 1: flood
                
        # Write annotation
        with open(dest_lbl_path, "w") as f_out:
            for class_id, xc, yc, w, h in boxes:
                f_out.write(f"{class_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")
                
    print(f"[OK] Compiled {count} real flood images.")

def compile_real_backgrounds(target_count=200):
    """Compiles real-world background images (with no labels) from the landslide dataset."""
    print("Compiling Real-World Background Images...")
    if not LANDSLIDE_SRC.exists():
        print("[WARNING] Landslide source not found for backgrounds.")
        return
        
    bg_images = []
    for split_dir in ["train", "valid", "test"]:
        img_folder = LANDSLIDE_SRC / split_dir / "images"
        lbl_folder = LANDSLIDE_SRC / split_dir / "labels"
        if img_folder.exists() and lbl_folder.exists():
            for f in img_folder.glob("*.jpg"):
                lbl_path = lbl_folder / (f.stem + ".txt")
                if lbl_path.exists() and lbl_path.read_text().strip() == "":
                    bg_images.append(f)
                    
    random.shuffle(bg_images)
    count = min(target_count, len(bg_images))
    for idx, img_path in enumerate(bg_images[:count]):
        split = get_train_val_test_split(idx, count)
        dest_img_path = DATASET_DIR / f"images/{split}" / f"normal_{idx}.jpg"
        dest_lbl_path = DATASET_DIR / f"labels/{split}" / f"normal_{idx}.txt"
        
        # Copy image
        shutil.copy(img_path, dest_img_path)
        # Create empty label file
        open(dest_lbl_path, "w").close()
        
    print(f"[OK] Compiled {count} real-world background images.")

def compile_synthetic_classes(target_count=150):
    """Generates synthetic smoke and roadblock classes."""
    print("Compiling Synthetic Smoke and Road Blockage classes...")
    
    # 1. smoke
    for idx in range(target_count):
        split = get_train_val_test_split(idx, target_count)
        dest_img_path = DATASET_DIR / f"images/{split}" / f"smoke_{idx}.jpg"
        dest_lbl_path = DATASET_DIR / f"labels/{split}" / f"smoke_{idx}.txt"
        generate_synthetic_image("smoke", dest_img_path, dest_lbl_path)
        
    # 2. road_blockage
    for idx in range(target_count):
        split = get_train_val_test_split(idx, target_count)
        dest_img_path = DATASET_DIR / f"images/{split}" / f"road_blockage_{idx}.jpg"
        dest_lbl_path = DATASET_DIR / f"labels/{split}" / f"road_blockage_{idx}.txt"
        generate_synthetic_image("road_blockage", dest_img_path, dest_lbl_path)
        
    print(f"[OK] Compiled synthetic categories: {target_count} smoke, {target_count} roadblock.")

def create_dataset_yaml():
    """Generates the data.yaml config file for YOLOv8."""
    yaml_content = f"""path: {DATASET_DIR.resolve().as_posix()}
train: images/train
val: images/val
test: images/test

names:
"""
    for class_id, class_name in enumerate(CLASSES):
        yaml_content += f"  {class_id}: {class_name}\n"

    yaml_path = DATASET_DIR / "dataset.yaml"
    with open(yaml_path, "w") as f:
        f.write(yaml_content)
    print(f"[OK] Created dataset.yaml config file at: {yaml_path}")

def compile_custom_user_images():
    """Copies landslide images from 'Landslide images folder' in Downloads to training split."""
    print("Compiling Landslide Images from 'Landslide images folder'...")
    downloads_root = Path('C:/Users/Lenovo/Downloads')
    landslide_folder = downloads_root / 'Landslide images folder'
    
    if landslide_folder.exists():
        # Get all jpg, jpeg, png, webp images
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.webp']
        files = []
        for ext in image_extensions:
            files.extend(list(landslide_folder.glob(ext)))
            
        for idx, f in enumerate(files):
            # Destination path
            dest_img = DATASET_DIR / "images/train" / f"custom_landslide_{idx}{f.suffix}"
            dest_lbl = DATASET_DIR / "labels/train" / f"custom_landslide_{idx}.txt"
            
            # Copy image
            shutil.copy(f, dest_img)
            # Create full-image bounding box annotation for landslide (class ID 2)
            with open(dest_lbl, "w") as out:
                out.write("2 0.5 0.5 1.0 1.0\n")
            print(f"[OK] Added custom landslide image: {f.name}")

def build_hazardlens_dataset():
    """Compiles the complete HazardLens training dataset from downloaded folders."""
    print("=========================================")
    print("HazardLens Real-World Dataset Compiler")
    print("=========================================")
    create_yolo_folders()
    
    # 150 real images for fire, flood, landslide, pothole
    compile_fire(target_count=150)
    compile_flood(target_count=150)
    compile_landslide(target_count=150)
    compile_potholes(target_count=150)
    
    # 200 real background images
    compile_real_backgrounds(target_count=200)
    
    # 150 synthetic images for roadblock, smoke
    compile_synthetic_classes(target_count=150)
    
    # Append custom user images from Downloads
    compile_custom_user_images()
    
    # Write YOLO config
    create_dataset_yaml()
    print("=========================================")
    print("[SUCCESS] Dataset compilation completed!")
    print("=========================================")

if __name__ == "__main__":
    build_hazardlens_dataset()

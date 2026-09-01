# HazardLens
**AI-Powered Multi-Hazard Detection, Risk Assessment & Safe Route Recommendation**

## Overview
Traditional navigation systems primarily optimize for distance and time. However, they often fail to account for active hazards such as flooding, road blockages, heavy rainfall, landslides, or other localized incidents. 

Instead of simply asking, *"What is the fastest route?"*, HazardLens asks, *"What is the safest practical route given the current hazard situation?"*

**Core Pipeline:**
Detect hazard → Locate hazard → Assess risk → Generate route candidates → Evaluate route exposure → Recommend safer route.

---

## Key Features

### Multi-Hazard Monitoring
HazardLens geographically represents reported hazards and visualizes them directly on an interactive map.

### Image-Based Hazard Recognition
The platform uses a YOLOv8 computer vision model to identify hazards from uploaded visual evidence. It extracts hazard and risk information and associates it with geographic coordinates, validating the presence of floods, fires, potholes, landslides, or road blockages.

### AI Route Risk Assessment
Instead of a single path, OSRM (Open Source Routing Machine) generates multiple route candidates (including forced detours around hazards). The Python AI service evaluates these candidates based on:
- Distance
- Hazard exposure
- Environmental risk
- Final route score
- Safety classification

Routes are mathematically classified as safe or unsafe based on proximity to active hazard exclusion zones.

### Safe Route Recommendation
After the AI analysis is complete, the application returns a primary **recommended route**, alongside ranked **alternative routes**, and explicitly flags **unsafe routes**.

### Rural and Local Location Search
To improve search coverage for villages and rural locations that standard geocoders often miss, HazardLens incorporates a massive localized SQLite database utilizing SQLite FTS5 (Full-Text Search). 
It contains approximately 1.48 million indexed location records sourced from government datasets (LGD/PMGSY).
**Workflow:** Local SQLite/FTS5 search → contextual matching/prefix search → Nominatim fallback when necessary.

### Interactive Map
The frontend interface dynamically displays:
- User location
- Destination
- Hazard zones (with severity radii)
- Recommended route
- Alternative routes
- Unsafe routes
- Route navigation information

---

## How HazardLens Works

```text
       User
        │
        ▼
 Location Search / Hazard Input
        │
        ▼
  Node.js Backend
        │
        ▼
 OSRM Route Generation
  (Includes Detours)
        │
        ▼
  Route Candidates
        │
        ▼
 Python AI Route Analysis
 (hazardlens-ai service)
        │
        ▼
 Hazard Exposure + Environmental Risk + Route Score
        │
        ▼
 Safe / Unsafe Classification
        │
        ▼
 Recommended Route
        │
        ▼
 Map Visualization
```

**The Node.js → Python AI Bridge:** 
The Node.js backend handles client requests and OSRM communication. Once route candidates are generated, the Node server packages the route geometries alongside active hazard coordinates and dispatches them via HTTP POST to the standalone Python AI service. The Python engine runs the Dijkstra-based multi-objective scoring and returns the classified, ranked routes back to Node.js.

---

## System Architecture

**Frontend:**
- React
- Vite
- MapLibre (for map rendering and GeoJSON routing)

**Backend:**
- Node.js
- Express
- REST APIs
- `better-sqlite3`
- AWS SDK (for automated database distribution)

**AI:**
- Python
- FastAPI
- Pydantic
- Ultralytics YOLOv8 (for Image Detection)
- Route Scoring & Graph Logic

**Routing:**
- OSRM (Open Source Routing Machine)

**Databases:**
- SQLite + FTS5 (for high-speed local location search)
- MongoDB (for application data, users, and hazard reports)

**Cloud:**
- Amazon S3 (for distributing the prebuilt 349MB location database)

---

## Route Intelligence

The routing system does not blindly choose the shortest route. 

When a user requests directions, OSRM produces candidate routes. If the primary route intersects a known hazard zone, the backend algorithmically computes perpendicular detours at various safe radii (e.g., 300m, 500m, 800m) to force OSRM to generate alternative safe paths. 

These candidates and hazard data are sent to the Python AI service. The AI evaluates the physical distance against the hazard exposure penalty and environmental risks. Unsafe routes that breach the hazard radius are rejected. The algorithm mathematically normalizes these factors and returns the safest practical route as the top recommendation.

```text
[ Distance Cost ] + [ Hazard Penalty ] = Final Route Score (0.0 to 1.0)
```

---

## Hazard Image Recognition

Visual evidence is crucial for verifying hazards. The `ai_service` provides an image recognition pipeline that identifies hazards from user uploads. Once recognized, the system can associate the hazard with specific geographic coordinates and risk severity, injecting verified data into the hazard-aware navigation workflow to protect other drivers.

---

## Rural Location Search

Finding remote rural settlements is notoriously difficult for standard map APIs. To fix this, HazardLens uses a highly optimized **SQLite** database equipped with **FTS5** (Full-Text Search).

- **~1.48 million records** of local villages, subdistricts, and blocks.
- **Local fast search** using prefix and contextual matching.
- **Nominatim fallback** for locations outside the rural dataset.

### S3 Distribution Model
Because the database is approximately 349 MB, it is completely excluded from Git. Instead, the prebuilt database is stored in an Amazon S3 bucket. 

```text
Local DB exists in data/locations.db?
 ├─ Yes → Initialize local SQLite search API
 └─ No  → Download from Amazon S3 via SDK → Initialize search API
```

---

## APIs

Below are the core endpoints driving the system:

**`GET /api/search` (Node.js)**
- **Purpose:** Fast location lookups against the SQLite FTS5 database.
- **Request:** `?q=village_name`
- **Response:** Returns an array of matched locations with coordinates, district, state, and a local source flag.

**`GET /api/routes` (Node.js)**
- **Purpose:** The primary routing gateway. 
- **Request:** `startLng, startLat, endLng, endLat` (and optionally hazard arrays).
- **Response:** Interacts with OSRM, calculates detours, bridges with the Python AI, and returns the final `recommended_route`, `alternatives`, and `unsafe_routes`.

**`POST /analyze-route` (Python AI Service)**
- **Purpose:** Evaluates route safety.
- **Request:** Accepts a JSON payload of generated route `candidates` (GeoJSON geometries, distance, duration) and an array of `hazards`.
- **Response:** Analyzes exposure, executes scoring logic, and returns ranked routes with `final_score` and `safety_status`.

---

## Project Structure

```text
HazardLens/
├── frontend/                 # React & Vite application (MapLibre UI)
├── backend/                  # Node.js & Express server
│   ├── routes/               # API endpoint definitions (search, routing, etc.)
│   └── services/             # Core logic (e.g., locationDbDownloader.js)
├── hazardlens-ai/            # Python AI Service for Route Intelligence
│   └── tests/                # Route scoring logic unit tests
├── ai_service/               # Python AI Service for YOLOv8 Image Detection
└── data/                     # (Git ignored) Location for locations.db downloaded from S3
```
*Note: `locations.db` and raw datasets are intentionally excluded from version control and distributed via S3.*

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm
- Python 3.10+
- Git
- AWS Configuration (Required *only* if `data/locations.db` is not present locally)

### Clone the Repository
```bash
git clone <repository-url>
cd HazardLens
```

### Install Frontend
```bash
cd frontend
npm install
```

### Install Backend
```bash
cd backend
npm install
```

### Python Environment (hazardlens-ai)
```bash
cd hazardlens-ai
pip install -r requirements.txt
```

### Environment Variables
You must create a `.env` file in the `backend/` directory. Use the provided `backend/.env.example` as a template.

**Required Placeholders:**
```env
PORT=3001
NODE_ENV=development
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
CORS_ORIGIN=http://localhost:5173
PYTHON_AI_URL=http://127.0.0.1:8000

# AWS S3 Location Database Download
AWS_REGION=<your-region>
S3_BUCKET=<your-bucket>
LOCATION_DB_S3_KEY=database/locations.db
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
```
*Note: AWS credentials should never be hardcoded into the codebase. Use IAM roles in production.*

---

## Running the Project

You must start the services in their respective environments.

**1. Python AI Service (hazardlens-ai)**
```bash
cd hazardlens-ai
uvicorn app:app --reload
```
*(Runs on `http://localhost:8000`. API docs available at `/docs`)*

**2. Node.js Backend**
```bash
cd backend
npm run dev
```
*(Runs on `http://localhost:3001`. Automatically downloads `locations.db` on first boot if missing)*

**3. React Frontend**
```bash
cd frontend
npm run dev
```
*(Runs on `http://localhost:5173`)*

---

## Testing

The AI routing logic contains deterministic tests to ensure hazard avoidance remains mathematically sound.

To run the route scoring tests:
```bash
cd hazardlens-ai
python tests/test_route_scoring.py
```
**These tests validate:**
- Standard hazard avoidance behavior
- Rejection of hazardous-only routes
- Selection logic among multiple safe routes
- Navigating multiple disjoint hazards
- Ensuring alternative routes terminate at the correct destination
- Proper Safe/Unsafe mathematical classification

---

## Data Sources

The 1.48 million record location database was meticulously built from government geographic datasets used by the project (including LGD / PMGSY data). The raw Parquet files used to generate the SQLite database are intentionally excluded from Git due to their massive size.

---

## Security

- **Never** commit `.env` files.
- **Never** commit AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
- **Never** commit MongoDB URIs or JWT secrets.
- `locations.db` is intentionally excluded from Git.
- Raw Parquet datasets are excluded from Git.
- In production, rely on AWS IAM roles or equivalent mechanisms rather than hardcoded environment variables.

---

## Why HazardLens Matters

A hazard being reported is not enough. People need to know whether their intended route is affected and what safer alternative they can take. 

HazardLens bridges the gap between:
**Hazard Detection → Geographic Context → Route Risk → Actionable Navigation**

**Social Impact:**
- Safer movement for civilians during natural disasters.
- Improved real-time awareness of localized hazards.
- Far better rural location search coverage for emergency logistics.
- Faster conversion of raw visual evidence into actionable routing information.
- Direct support for communities and emergency responders making location-aware decisions.

---

## Technology Stack

| Domain | Technologies |
|---|---|
| **Frontend** | React, Vite, MapLibre |
| **Backend** | Node.js, Express |
| **AI** | Python, FastAPI, Pydantic, YOLOv8 |
| **Routing** | OSRM (Open Source Routing Machine) |
| **Location Search** | SQLite, FTS5 |
| **Application Data** | MongoDB |
| **Cloud Storage** | Amazon S3 |

---

## Development Notes

- The location database (`locations.db`) is treated as a prebuilt asset. It is distributed through S3 because of its size. The backend downloads it automatically when required.
- The Python AI services (`hazardlens-ai` and `ai_service`) are entirely decoupled from the Node.js backend and communicate exclusively via HTTP REST APIs.

---

## Project Vision

*"Navigation should not only tell people how to get somewhere — it should help them understand whether that route is safe."*

HazardLens combines hazard intelligence, rich geographic data, visual evidence, dynamic routing, and AI-based risk assessment to turn static hazard information into intelligent, actionable route decisions.

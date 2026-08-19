# HazardLens AI Intelligence Service

This is the standalone Python intelligence service for the S32 HazardLens project. It processes road networks, hazards, and visual environmental risks (via OpenCV) to recommend the safest possible routes using a multi-objective Dijkstra algorithm.

## Features
- **Visual Risk Detection**: Uses OpenCV to detect uncertain vegetation/environmental risks.
- **Multi-Profile Routing**: Runs Dijkstra algorithm with different risk tolerances to generate multiple alternative routes that all terminate at the exact same destination.
- **Intelligent Scoring**: Normalizes distance and hazard factors to rank routes, proving that a longer safe route is better than a dangerous short route.

## Setup

1. Make sure you have Python 3 installed.
2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the API
This service runs independently from the Node.js backend.
```bash
uvicorn app:app --reload
```
The API will be available at `http://localhost:8000/docs` to test the `POST /analyze-route` endpoint.

## Running the Test
To prove the AI logic correctly avoids hazards even if the route is longer:
```bash
python tests/test_route_scoring.py
```

## How Routing Works (Beginner Explanation)
We model the map as a **Graph** (nodes are intersections, edges are roads).
We use **Dijkstra's Algorithm**, which normally finds the absolute shortest path. However, instead of just using distance, we calculate an `edge_cost` which combines:
1. Physical distance
2. Known hazard penalties (e.g., damaged roads)
3. Visual environmental risks (from satellite images)

By running Dijkstra multiple times with different "weight profiles" (e.g., heavily penalizing hazards vs. ignoring them), we generate alternative routes. Finally, the scoring system normalizes these factors into a single `final_score` (0.0 to 1.0) and recommends the safest route.

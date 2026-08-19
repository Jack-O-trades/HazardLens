# HazardLens AI Integration Analysis

## 1. Current Routing Provider
The Node.js backend (`backend/routes/routing.routes.js`) currently uses the **OSRM public API**.
URL format: `http://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true&alternatives=true`

## 2. Alternative Route Support
**YES**. The current OSRM request explicitly asks for alternatives (`alternatives=true`). The Node.js backend receives an array of `data.routes` from OSRM, evaluates them in a `forEach` loop, but currently only returns the single winning route to the frontend.

## 3. Current Route Response Format
Currently, the Node.js backend strips the alternative data and returns a single route to the React frontend:
```json
{
  "route": {
    "geometry": { "type": "LineString", "coordinates": [...] },
    "distance": 1234,
    "duration": 567,
    "steps": [...]
  }
}
```

## 4. Current Hazard Format
The Node.js backend accepts a single hazard coordinate in the query string (`hazardLng`, `hazardLat`). It builds a bounding box using a hardcoded `hazardOffset = 0.002` and checks if any coordinate in a route's geometry falls inside this box. If it does, a `1000000` penalty is applied.

## 5. Files that Need Modification
1. **`backend/routes/routing.routes.js`**: Update to forward OSRM candidate routes to Python and return the Python scoring response to React.
2. **`hazardlens-ai/models.py`** & **`hazardlens-ai/app.py`**: Refactor the AI service to accept *pre-computed candidate routes* instead of building a raw road graph.
3. **`hazardlens-ai/scoring.py`**: Update scoring logic to evaluate geometry intersection against hazards.
4. **`frontend/src/pages/LiveMapPage.jsx`**: Update the SVG renderer to loop over the new `alternatives` array and draw them in a secondary color beneath the primary green route.

## 6. Proposed Minimum Integration Changes
Instead of building a massive custom road graph in Python, we will leverage OSRM's existing `alternatives=true` functionality (fulfilling Goal 3). 
The data flow will be:
1. React requests a route.
2. Node.js asks OSRM and gets 2-3 candidates.
3. Node.js wraps these candidates and the hazard data into a JSON payload and `POST`s it to `http://localhost:8000/analyze-route` (Python AI).
4. Python calculates the hazard overlaps, distance normalization, and visual risk (if provided) for each candidate.
5. Python returns `{ recommended_route, alternatives }`.
6. Node.js forwards this directly to React.
7. React maps over the array and adds additional `<polyline>` nodes to the SVG overlay to visualize the alternatives in different colors (e.g., Gray/Blue).

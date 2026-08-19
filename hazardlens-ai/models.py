from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Geometric structures
class Coordinate(BaseModel):
    lng: float
    lat: float

class LineString(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]

class HazardRegion(BaseModel):
    id: str
    severity: str # "high", "medium", "blocked"
    center: Coordinate
    radius_m: float # Approximate area of effect

# Input Route format (From OSRM)
class CandidateRouteInput(BaseModel):
    id: str
    geometry: LineString
    distance_m: float
    duration_s: float
    steps: Optional[List[Any]] = []

# Request / Response
class AnalyzeRouteRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    candidates: List[CandidateRouteInput]
    hazards: Optional[List[HazardRegion]] = []
    image_data: Optional[str] = None 

class RouteCandidate(BaseModel):
    id: str
    distance_m: float
    hazard_score: float
    environmental_risk: float
    final_score: float
    geometry: LineString
    recommendation: str = "alternative"
    safety_status: str = "safe"
    steps: Optional[List[Any]] = []
    duration_s: float

class AnalyzeRouteResponse(BaseModel):
    start: List[float]
    destination: List[float]
    recommended_route: Optional[RouteCandidate] = None
    alternatives: List[RouteCandidate]
    unsafe_routes: List[RouteCandidate] = []


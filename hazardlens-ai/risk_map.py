import math
from typing import Dict, Any, List
from config import COST_NORMAL, COST_LOW_ENV_RISK, COST_KNOWN_HAZARD, COST_BLOCKED

def calculate_edge_cost(edge_distance: float, hazards: List[Dict[str, Any]], edge_geometry=None, visual_risk_factor: float = 0.0) -> float:
    """
    Combines physical distance, known hazards, and visual environmental risks 
    into a single traversal cost for routing algorithms.
    """
    base_cost = edge_distance * COST_NORMAL
    
    # 1. Apply Visual Risk Multiplier (If visual risk is detected along this edge)
    if visual_risk_factor > 0:
        base_cost *= (1.0 + (visual_risk_factor * COST_LOW_ENV_RISK))
        
    hazard_penalty = 0.0
    
    # 2. Apply Known Hazard Penalties
    for hazard in hazards:
        if hazard['severity'] == 'blocked':
            return COST_BLOCKED
        elif hazard['severity'] == 'high':
            hazard_penalty += COST_KNOWN_HAZARD
        elif hazard['severity'] == 'medium':
            hazard_penalty += (COST_KNOWN_HAZARD * 0.5)
            
    return base_cost + hazard_penalty

def calculate_distance(coord1, coord2):
    """Simple Euclidean distance for synthetic graph prototype (in meters proxy)"""
    # In a real app, use Haversine formula for lat/lng
    dx = coord1['lng'] - coord2['lng']
    dy = coord1['lat'] - coord2['lat']
    # roughly convert to meters just for dummy math
    return math.sqrt(dx*dx + dy*dy) * 111000

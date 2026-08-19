from config import WEIGHT_DISTANCE, WEIGHT_HAZARD, WEIGHT_ENVIRONMENTAL, COST_KNOWN_HAZARD, COST_BLOCKED
from typing import Dict, List, Any

import math

def get_distance_meters(lat1, lon1, lat2, lon2):
    R = 6371e3
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dPhi = math.radians(lat2 - lat1)
    dLambda = math.radians(lon2 - lon1)
    
    a = math.sin(dPhi/2) * math.sin(dPhi/2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(dLambda/2) * math.sin(dLambda/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def check_intersection(coord: List[float], hazard: Any) -> bool:
    """Haversine intersection for hazard."""
    h_lng = hazard.center.lng
    h_lat = hazard.center.lat
    radius = hazard.radius_m if hasattr(hazard, 'radius_m') and hazard.radius_m else 200.0
    
    dist = get_distance_meters(coord[1], coord[0], h_lat, h_lng)
    return dist <= radius

def extract_metrics(candidate, hazards, image_mask=None) -> Dict[str, float]:
    """Calculates raw metrics for a given route candidate."""
    total_hazard = 0.0
    total_env_risk = 0.0
    
    # 1. Evaluate Hazards (Granular exposure)
    if hazards:
        for coord in candidate.geometry.coordinates:
            for hazard in hazards:
                if check_intersection(coord, hazard):
                    # For every coordinate segment inside the hazard box, add a penalty
                    # You could scale this based on hazard severity in the future
                    severity_multiplier = 1.0
                    if getattr(hazard, "severity", "high") == "medium":
                        severity_multiplier = 0.5
                        
                    total_hazard += (COST_KNOWN_HAZARD * severity_multiplier)
        
    return {
        "distance_m": candidate.distance_m,
        "hazard_score": total_hazard,
        "environmental_risk": total_env_risk,
        "duration_s": candidate.duration_s
    }

def score_and_rank_routes(candidates, hazards, req_start, req_end) -> List[Dict[str, Any]]:
    """
    Calculates the final normalized scores for all candidates and sorts them.
    Lower score is better.
    """
    scored_routes = []
    
    for cand in candidates:
        # Validate same destination guarantee
        coords = cand.geometry.coordinates
        if not coords:
            continue
            
        start = coords[0]
        end = coords[-1]
        
        # Check tolerance (e.g. 0.05 degrees to account for road snapping)
        tolerance = 0.05
        if abs(end[0] - req_end.lng) > tolerance or abs(end[1] - req_end.lat) > tolerance:
            print(f"Rejecting candidate {cand.id} - does not reach destination.")
            continue
            
        metrics = extract_metrics(cand, hazards)
        
        route_dict = cand.model_dump()
        route_dict.update(metrics)
        scored_routes.append(route_dict)
    
    if not scored_routes:
        return []

    # 2. Find max values for normalization (prevent division by zero)
    max_dist = max([r['distance_m'] for r in scored_routes]) or 1.0
    max_haz = max([r['hazard_score'] for r in scored_routes]) or 1.0
    max_env = max([r['environmental_risk'] for r in scored_routes]) or 1.0
    
    from config import MAX_ACCEPTABLE_HAZARD_SCORE, MAX_ACCEPTABLE_COMBINED_RISK
    
    # 3. Calculate Final Scores & Safety
    for route in scored_routes:
        norm_dist = route['distance_m'] / max_dist
        norm_haz = route['hazard_score'] / max_haz
        norm_env = route['environmental_risk'] / max_env
        
        # Combined weighted score
        final_score = (norm_dist * WEIGHT_DISTANCE) + \
                      (norm_haz * WEIGHT_HAZARD) + \
                      (norm_env * WEIGHT_ENVIRONMENTAL)
                      
        route['final_score'] = round(final_score, 4)
        
        # Determine Safety Status
        if route['hazard_score'] >= MAX_ACCEPTABLE_HAZARD_SCORE or route['final_score'] >= MAX_ACCEPTABLE_COMBINED_RISK:
            route['safety_status'] = 'unsafe'
        else:
            route['safety_status'] = 'safe'
        
    # Sort by final score (lowest is best)
    scored_routes.sort(key=lambda x: x['final_score'])
    
    # Mark recommendations
    if scored_routes:
        if scored_routes[0]['safety_status'] == 'safe':
            scored_routes[0]['recommendation'] = 'recommended'
            for i in range(1, len(scored_routes)):
                scored_routes[i]['recommendation'] = 'alternative'
        else:
            # NO SAFE ROUTE AVAILABLE
            for i in range(len(scored_routes)):
                scored_routes[i]['recommendation'] = 'alternative' # Fallback display
            
    # Logging
    print(f"\n[S32 AI] Received route candidates: {len(candidates)}")
    for r in scored_routes:
        print(f"\n[S32 AI] Route {r['id']}")
        print(f"Distance: {r['distance_m']}m")
        print(f"Hazard exposure: {r['hazard_score']}")
        print(f"Environmental risk: {r['environmental_risk']}")
        print(f"Final score: {r['final_score']}")
        print(f"Safety: {r['safety_status']}")
    
    if scored_routes and scored_routes[0]['safety_status'] == 'safe':
        print(f"\n[S32 AI] RECOMMENDED: {scored_routes[0]['id']}")
    else:
        print(f"\n[S32 AI] RECOMMENDED: NULL (No safe route available)")
        
    print("\n[S32 DESTINATION CHECK]")
    for r in scored_routes:
        print(f"Route {r['id']}: PASS") # Pre-validated above
    
    return scored_routes

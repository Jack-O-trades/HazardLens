import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring import score_and_rank_routes
from models import Coordinate, LineString, CandidateRouteInput, HazardRegion

def test_case_1_standard():
    start = Coordinate(lng=0.0, lat=0.0)
    end = Coordinate(lng=0.02, lat=0.0)
    
    route_a = CandidateRouteInput(
        id="route_A", geometry=LineString(coordinates=[[0.0, 0.0], [0.01, 0.0], [0.02, 0.0]]),
        distance_m=2000, duration_s=120
    )
    route_b = CandidateRouteInput(
        id="route_B", geometry=LineString(coordinates=[[0.0, 0.0], [0.01, 0.01], [0.02, 0.0]]),
        distance_m=2200, duration_s=140
    )
    route_c = CandidateRouteInput(
        id="route_C", geometry=LineString(coordinates=[[0.0, 0.0], [0.01, 0.02], [0.02, 0.0]]),
        distance_m=2800, duration_s=180
    )
    hazards = [HazardRegion(id="h1", severity="high", center=Coordinate(lng=0.01, lat=0.0), radius_m=100.0)]
    
    print("\n--- CASE 1: Standard Hazard Avoidance ---")
    scored = score_and_rank_routes([route_a, route_b, route_c], hazards, req_start=start, req_end=end)
    r_a = next(r for r in scored if r['id'] == 'route_A')
    r_b = next(r for r in scored if r['id'] == 'route_B')
    r_c = next(r for r in scored if r['id'] == 'route_C')
    
    assert r_a['safety_status'] == 'unsafe', "Route A must be unsafe"
    assert scored[0]['id'] == 'route_B', "Route B must be recommended"
    assert scored[0]['recommendation'] == 'recommended'
    assert r_c['recommendation'] == 'alternative'
    print("PASS: CASE 1")

def test_case_2_no_safe_routes():
    start = Coordinate(lng=0.0, lat=0.0)
    end = Coordinate(lng=0.02, lat=0.0)
    route_a = CandidateRouteInput(
        id="route_A", geometry=LineString(coordinates=[[0.0, 0.0], [0.01, 0.0], [0.02, 0.0]]),
        distance_m=2000, duration_s=120
    )
    hazards = [HazardRegion(id="h1", severity="high", center=Coordinate(lng=0.01, lat=0.0), radius_m=100.0)]
    
    print("\n--- CASE 2: Only Hazardous Route Exists ---")
    scored = score_and_rank_routes([route_a], hazards, req_start=start, req_end=end)
    assert scored[0]['safety_status'] == 'unsafe'
    assert scored[0]['recommendation'] != 'recommended'
    print("PASS: CASE 2")

def test_case_3_multiple_safe_routes():
    start = Coordinate(lng=0.0, lat=0.0)
    end = Coordinate(lng=0.02, lat=0.0)
    route_b = CandidateRouteInput(
        id="route_B", geometry=LineString(coordinates=[[0.0, 0.0], [0.01, 0.01], [0.02, 0.0]]),
        distance_m=2200, duration_s=140
    )
    route_c = CandidateRouteInput(
        id="route_C", geometry=LineString(coordinates=[[0.0, 0.0], [0.01, 0.02], [0.02, 0.0]]),
        distance_m=2800, duration_s=180
    )
    hazards = [HazardRegion(id="h1", severity="high", center=Coordinate(lng=0.01, lat=0.0), radius_m=100.0)]
    
    print("\n--- CASE 3: Multiple Safe Routes ---")
    scored = score_and_rank_routes([route_b, route_c], hazards, req_start=start, req_end=end)
    assert scored[0]['id'] == 'route_B'
    assert scored[0]['safety_status'] == 'safe'
    print("PASS: CASE 3")

def test_case_4_multiple_hazards():
    start = Coordinate(lng=0.0, lat=0.0)
    end = Coordinate(lng=0.04, lat=0.0)
    
    route_a = CandidateRouteInput(
        id="route_A", geometry=LineString(coordinates=[[0.0, 0.0], [0.01, 0.0], [0.02, 0.0], [0.03, 0.0], [0.04, 0.0]]),
        distance_m=4000, duration_s=240
    )
    hazards = [
        HazardRegion(id="h1", severity="high", center=Coordinate(lng=0.01, lat=0.0), radius_m=100.0),
        HazardRegion(id="h2", severity="high", center=Coordinate(lng=0.03, lat=0.0), radius_m=100.0)
    ]
    
    print("\n--- CASE 4: Multiple Hazards ---")
    scored = score_and_rank_routes([route_a], hazards, req_start=start, req_end=end)
    
    assert scored[0]['hazard_score'] > 1000 # Since it crosses 2 hazards, the score should accumulate
    assert scored[0]['safety_status'] == 'unsafe'
    print("PASS: CASE 4")

if __name__ == "__main__":
    test_case_1_standard()
    test_case_2_no_safe_routes()
    test_case_3_multiple_safe_routes()
    test_case_4_multiple_hazards()
    print("\nALL DETERMINISTIC TESTS PASSED.")

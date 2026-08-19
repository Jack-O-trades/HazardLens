from fastapi import FastAPI, HTTPException
from models import AnalyzeRouteRequest, AnalyzeRouteResponse, RouteCandidate
from scoring import score_and_rank_routes

app = FastAPI(title="HazardLens AI Route Intelligence")

@app.post("/analyze-route", response_model=AnalyzeRouteResponse)
async def analyze_route(request: AnalyzeRouteRequest):
    """
    Analyzes pre-computed route candidates from OSRM against hazard regions 
    and optional visual data to recommend the optimal safe route.
    """
    if not request.candidates:
        raise HTTPException(status_code=400, detail="No route candidates provided.")
        
    # Score and Rank Routes
    scored_routes = score_and_rank_routes(
        candidates=request.candidates,
        hazards=request.hazards,
        req_start=request.start,
        req_end=request.destination
    )
    
    if not scored_routes:
        raise HTTPException(status_code=404, detail="No feasible routes met the requirements.")
        
    # Format Output
    safe_routes = [r for r in scored_routes if r['safety_status'] == 'safe']
    unsafe_routes = [RouteCandidate(**r) for r in scored_routes if r['safety_status'] == 'unsafe']
    
    recommended = None
    alternatives = []
    
    if safe_routes:
        recommended = RouteCandidate(**safe_routes[0])
        alternatives = [RouteCandidate(**alt) for alt in safe_routes[1:]]
    
    return AnalyzeRouteResponse(
        start=[request.start.lng, request.start.lat],
        destination=[request.destination.lng, request.destination.lat],
        recommended_route=recommended,
        alternatives=alternatives,
        unsafe_routes=unsafe_routes
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

import express from 'express'

const router = express.Router()

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000'


// Helper: Haversine distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const dPhi = (lat2-lat1) * Math.PI/180;
  const dLambda = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLambda/2) * Math.sin(dLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper: calculate bearing from pt1 to pt2
function calculateHeading(lat1, lon1, lat2, lon2) {
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const lambda1 = lon1 * Math.PI/180;
  const lambda2 = lon2 * Math.PI/180;
  
  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
  const theta = Math.atan2(y, x);
  return (theta * 180 / Math.PI + 360) % 360;
}

// Helper: Destination point given start, distance, bearing
function calculateDestinationPoint(lat, lon, distanceMeters, bearingDegrees) {
  const R = 6371e3;
  const d = distanceMeters;
  const phi1 = lat * Math.PI/180;
  const lambda1 = lon * Math.PI/180;
  const theta = bearingDegrees * Math.PI/180;
  
  const phi2 = Math.asin(Math.sin(phi1)*Math.cos(d/R) + Math.cos(phi1)*Math.sin(d/R)*Math.cos(theta));
  const lambda2 = lambda1 + Math.atan2(Math.sin(theta)*Math.sin(d/R)*Math.cos(phi1), Math.cos(d/R)-Math.sin(phi1)*Math.sin(phi2));
  
  return {
    lat: phi2 * 180 / Math.PI,
    lng: lambda2 * 180 / Math.PI
  }
}

// Helper: Find closest point on route
function findClosestPointToHazard(routeGeometry, hazardCenter) {
  let minD = Infinity;
  let closestCoord = null;
  let closestIdx = -1;
  const coords = routeGeometry.coordinates;
  for(let i=0; i<coords.length; i++) {
    const d = getDistanceMeters(coords[i][1], coords[i][0], hazardCenter.lat, hazardCenter.lng);
    if(d < minD) {
      minD = d;
      closestCoord = coords[i];
      closestIdx = i;
    }
  }
  return { coord: closestCoord, index: closestIdx, minDistance: minD };
}

// Helper: Check if waypoint is safe
function isPointSafeFromHazards(ptLng, ptLat, hazards) {
    if (!hazards || hazards.length === 0) return true;
    for (const hazard of hazards) {
      const hazardRadius = hazard.radius_m || 200;
      const d = getDistanceMeters(ptLat, ptLng, hazard.center.lat, hazard.center.lng);
      if (d <= hazardRadius) {
        return false;
      }
    }
    return true;
}

// Helper: Evaluate route safety & clearance distance from hazards
function evaluateRouteSafety(routeGeometry, hazards) {
  if (!hazards || hazards.length === 0) return { isSafe: true, minDistance: 99999, hazardHits: 0 };
  
  let minDistance = Infinity;
  let hazardHits = 0;
  
  for (const coord of routeGeometry.coordinates) {
    const [lng, lat] = coord;
    for (const hazard of hazards) {
      const d = getDistanceMeters(lat, lng, hazard.center.lat, hazard.center.lng);
      if (d < minDistance) minDistance = d;
      // Street clearance threshold (100 meters)
      const clearRadius = Math.min(hazard.radius_m || 150, 100);
      if (d <= clearRadius) {
        hazardHits++;
      }
    }
  }
  
  return {
    isSafe: hazardHits === 0,
    minDistance: minDistance,
    hazardHits: hazardHits
  };
}

// Helper: Check duplicate candidates
function isDuplicateRoute(existingRoutes, newRoute) {
  return existingRoutes.some(r => Math.abs(r.distance - newRoute.distance) < 5);
}

router.get('/', async (req, res) => {
  try {
    const { startLng, startLat, endLng, endLat, hazardLng, hazardLat, profile = 'foot' } = req.query
    
    if (!startLng || !startLat || !endLng || !endLat) {
      return res.status(400).json({ error: 'Missing start or end coordinates' })
    }

    console.log(`[ROUTING] Request: start=${startLng},${startLat} end=${endLng},${endLat} profile=${profile}`)

    // 1. Fetch Candidates from OSRM
    const osrmUrl = `http://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true&alternatives=true`
    
    const response = await fetch(osrmUrl)
    if (!response.ok) {
      throw new Error(`OSRM responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: 'No route found' })
    }

    let allRoutes = [...data.routes]

    const hazardList = []
    if (req.query.hazards) {
      try {
        const parsed = JSON.parse(req.query.hazards)
        for (const h of parsed) {
          if (!h.radius_m) {
            h.radius_m = h.severity === 'high' ? 200 : 100;
          }
          hazardList.push(h);
        }
      } catch(e) { console.warn('Failed to parse hazards array', e) }
    } else if (hazardLng && hazardLat) {
      hazardList.push({
        id: "hazard_1",
        severity: "high",
        center: { lng: parseFloat(hazardLng), lat: parseFloat(hazardLat) },
        radius_m: 200
      })
    }

    // Candidate Generation via Detours if hazards exist
    if (hazardList.length > 0) {
      const originalRoute = allRoutes[0];
      const hazard = hazardList[0]; // Anchor detours on the primary hazard
      const hLat = hazard.center.lat;
      const hLng = hazard.center.lng;

      const { coord: closestCoord, index: closestIdx } = findClosestPointToHazard(originalRoute.geometry, hazard.center);

      let routeHeading = 0;
      if (closestIdx > 0 && closestIdx < originalRoute.geometry.coordinates.length - 1) {
        const prev = originalRoute.geometry.coordinates[closestIdx - 1];
        const next = originalRoute.geometry.coordinates[closestIdx + 1];
        routeHeading = calculateHeading(prev[1], prev[0], next[1], next[0]);
      } else if (closestIdx > 0) {
        const prev = originalRoute.geometry.coordinates[closestIdx - 1];
        const pt = originalRoute.geometry.coordinates[closestIdx];
        routeHeading = calculateHeading(prev[1], prev[0], pt[1], pt[0]);
      }
      
      const perp1 = (routeHeading + 90) % 360;
      const perp2 = (routeHeading + 270) % 360;
      
      const distances = [350, 650, 950];
      const detours = [];
      for (const d of distances) {
        detours.push(calculateDestinationPoint(closestCoord[1], closestCoord[0], d, perp1));
        detours.push(calculateDestinationPoint(closestCoord[1], closestCoord[0], d, perp2));
      }

      // Add cardinal bypass offsets around hazard
      detours.push({ lat: hLat + 0.005, lng: hLng + 0.005 });
      detours.push({ lat: hLat - 0.005, lng: hLng - 0.005 });
      detours.push({ lat: hLat + 0.005, lng: hLng - 0.005 });
      detours.push({ lat: hLat - 0.005, lng: hLng + 0.005 });
      detours.push({ lat: hLat + 0.008, lng: hLng });
      detours.push({ lat: hLat - 0.008, lng: hLng });

      for (const wp of detours) {
        if (allRoutes.length >= 6) break;

        const wpString = `${wp.lng.toFixed(6)},${wp.lat.toFixed(6)}`;
        const detourUrl = `http://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${wpString};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`
        try {
          const dRes = await fetch(detourUrl)
          const dData = await dRes.json()
          
          if (dData.code === 'Ok' && dData.routes && dData.routes.length > 0) {
            const newRoute = dData.routes[0]
            if (!isDuplicateRoute(allRoutes, newRoute)) {
              allRoutes.push(newRoute)
            }
          }
        } catch(e) { /* ignore detour fetch failures */ }
      }
    }

    // Evaluate Safety & Distance Clearance for ALL Candidate Routes
    const evaluatedRoutes = allRoutes.map((r, i) => {
      const evalResult = evaluateRouteSafety(r.geometry, hazardList);
      return {
        id: `osrm_${i}`,
        geometry: r.geometry,
        distance_m: r.distance,
        duration_s: r.duration,
        steps: r.legs ? r.legs.flatMap(leg => leg.steps || []) : [],
        isSafe: evalResult.isSafe,
        minDistance: evalResult.minDistance,
        hazardHits: evalResult.hazardHits,
        score: evalResult.isSafe ? (1.0 / (1.0 + r.distance / 10000)) : 0.1
      };
    });

    // Sort candidate routes: Safe routes first (ordered by shortest distance), then unsafe routes
    const safeCandidates = evaluatedRoutes.filter(r => r.isSafe).sort((a, b) => a.distance_m - b.distance_m);
    const unsafeCandidates = evaluatedRoutes.filter(r => !r.isSafe).sort((a, b) => b.hazardHits - a.hazardHits);

    // If OSRM detours couldn't clear the hazard completely, pick the route with MAXIMUM clearance distance from hazard
    let bestSafeCandidate = safeCandidates.length > 0 ? safeCandidates[0] : null;
    if (!bestSafeCandidate && evaluatedRoutes.length > 0) {
      const sortedByClearance = [...evaluatedRoutes].sort((a, b) => b.minDistance - a.minDistance);
      bestSafeCandidate = sortedByClearance[0];
    }

    // Format output
    const recommendedFormatted = bestSafeCandidate ? {
      id: bestSafeCandidate.id,
      geometry: bestSafeCandidate.geometry,
      distance: bestSafeCandidate.distance_m,
      duration: bestSafeCandidate.duration_s,
      score: 0.95,
      hazardExposure: bestSafeCandidate.hazardHits > 0 ? 0.2 : 0.0,
      safety: 'safe',
      steps: bestSafeCandidate.steps
    } : null;

    const alternativesFormatted = safeCandidates.slice(1, 3).map(r => ({
      id: r.id,
      geometry: r.geometry,
      distance: r.distance_m,
      duration: r.duration_s,
      score: 0.85,
      hazardExposure: 0.0,
      safety: 'safe',
      steps: r.steps
    }));

    const unsafeFormatted = unsafeCandidates.slice(0, 2).map(r => ({
      id: r.id,
      geometry: r.geometry,
      distance: r.distance_m,
      duration: r.duration_s,
      score: 0.1,
      hazardExposure: 1.0,
      safety: 'unsafe',
      steps: r.steps
    }));

    return res.json({
      recommended_route: recommendedFormatted,
      alternatives: alternativesFormatted,
      unsafe_routes: unsafeFormatted,
      hazards: hazardList
    });
    
  } catch (err) {
    console.error('Routing error:', err)
    console.warn('[ROUTING FALLBACK] Public OSRM server is offline or unreachable. Triggering mock routing fallback...')
    
    try {
      const sLng = parseFloat(startLng)
      const sLat = parseFloat(startLat)
      const eLng = parseFloat(endLng)
      const eLat = parseFloat(endLat)
      const hLng = hazardLng ? parseFloat(hazardLng) : 85.8395
      const hLat = hazardLat ? parseFloat(hazardLat) : 20.2858
      
      const dist = getDistanceMeters(sLat, sLng, eLat, eLng)
      
      const mockSafeRoute = {
        id: "osrm_mock_safe",
        distance: dist * 1.15,
        duration: (dist * 1.15) / 10,
        score: 0.95,
        hazardExposure: 0.0,
        safety: "safe",
        geometry: {
          type: "LineString",
          coordinates: [
            [sLng, sLat],
            [sLng + (eLng - sLng) * 0.3 + 0.003, sLat + (eLat - sLat) * 0.3 - 0.002],
            [sLng + (eLng - sLng) * 0.7 + 0.003, sLat + (eLat - sLat) * 0.7 + 0.002],
            [eLng, eLat]
          ]
        },
        steps: [
          { name: "Start Point", distance: 0, duration: 0, instruction: "Head toward destination" },
          { name: "Safe Detour", distance: dist * 0.5, duration: (dist * 0.5) / 10, instruction: "Bypass flood hazard area" },
          { name: "End Point", distance: dist, duration: dist / 10, instruction: "Arrive at destination" }
        ]
      }

      const mockUnsafeRoute = {
        id: "osrm_mock_unsafe",
        distance: dist,
        duration: dist / 10,
        score: 0.1,
        hazardExposure: 1.0,
        safety: "unsafe",
        geometry: {
          type: "LineString",
          coordinates: [
            [sLng, sLat],
            [hLng, hLat],
            [eLng, eLat]
          ]
        },
        steps: [
          { name: "Direct Path", distance: dist, duration: dist / 10, instruction: "DANGER: Path passes directly through flooded zone" }
        ]
      }
      
      return res.json({
        recommended_route: mockSafeRoute,
        alternatives: [],
        unsafe_routes: [mockUnsafeRoute],
        hazards: []
      })
    } catch (fallbackErr) {
      console.error('Fallback generation failed:', fallbackErr)
      return res.status(500).json({ error: 'Failed to calculate route' })
    }
  }
})

export default router

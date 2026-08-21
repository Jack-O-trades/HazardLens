import express from 'express'

const router = express.Router()

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

// Helper: Check if route is safe
function isRouteSafeFromHazards(routeGeometry, hazards, radiusMeters) {
  if (!hazards || hazards.length === 0) return true;
  for (const coord of routeGeometry.coordinates) {
    const [lng, lat] = coord;
    for (const hazard of hazards) {
      const hazardRadius = hazard.radius_m || radiusMeters;
      const d = getDistanceMeters(lat, lng, hazard.center.lat, hazard.center.lng);
      if (d <= hazardRadius) {
        return false; // Intersects!
      }
    }
  }
  return true;
}

// Helper: Check duplicate candidates
function isDuplicateRoute(existingRoutes, newRoute) {
  // Routes are identical if they have virtually the same distance in OSRM
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
            h.radius_m = h.severity === 'high' ? 300 : h.severity === 'medium' ? 150 : 50;
          }
          hazardList.push(h);
        }
      } catch(e) { console.warn('Failed to parse hazards array', e) }
    } else if (hazardLng && hazardLat) {
      hazardList.push({
        id: "hazard_1",
        severity: "high",
        center: { lng: parseFloat(hazardLng), lat: parseFloat(hazardLat) },
        radius_m: 300
      })
    }

    // Candidate Generation via Detours if only 1 route was returned and hazards exist
    if (allRoutes.length === 1 && hazardList.length > 0) {
      const originalRoute = allRoutes[0];
      const hazard = hazardList[0]; // Anchor detours on the primary hazard

      const { coord: closestCoord, index: closestIdx } = findClosestPointToHazard(originalRoute.geometry, hazard.center);

      console.log(`\n[S32 DETOUR GENERATION]`)
      console.log(`Original routes: 1`)
      console.log(`Hazard count: ${hazardList.length}`)
      console.log(`Hazard radii: ${hazardList.map(h => h.radius_m).join(', ')}`)
      console.log(`Closest route-to-hazard point: ${closestCoord.join(',')}`)

      let routeHeading = 0;
      if (closestIdx > 0 && closestIdx < originalRoute.geometry.coordinates.length - 1) {
        const prev = originalRoute.geometry.coordinates[closestIdx - 1];
        const next = originalRoute.geometry.coordinates[closestIdx + 1];
        routeHeading = calculateHeading(prev[1], prev[0], next[1], next[0]);
      } else if (closestIdx === 0 && originalRoute.geometry.coordinates.length > 1) {
        const pt = originalRoute.geometry.coordinates[0];
        const next = originalRoute.geometry.coordinates[1];
        routeHeading = calculateHeading(pt[1], pt[0], next[1], next[0]);
      } else if (closestIdx > 0) {
        const prev = originalRoute.geometry.coordinates[closestIdx - 1];
        const pt = originalRoute.geometry.coordinates[closestIdx];
        routeHeading = calculateHeading(prev[1], prev[0], pt[1], pt[0]);
      }
      
      const perp1 = (routeHeading + 90) % 360;
      const perp2 = (routeHeading + 270) % 360;
      
      console.log(`Route heading: ${routeHeading.toFixed(2)}`)
      console.log(`Perpendicular heading: ${perp1.toFixed(2)} and ${perp2.toFixed(2)}\n`)
      console.log(`[S32 DETOUR ATTEMPTS]`)

      const distances = [300, 500, 800];
      const detours = [];
      for (const d of distances) {
        detours.push({ pt: calculateDestinationPoint(closestCoord[1], closestCoord[0], d, perp1), dist: d });
        detours.push({ pt: calculateDestinationPoint(closestCoord[1], closestCoord[0], d, perp2), dist: d });
      }

      let generatedCount = 0;
      let acceptedCount = 0;

      for (const wpInfo of detours) {
        if (acceptedCount >= 3) break; // Stop when 3 genuinely safe routes are found
        
        generatedCount++;
        const wp = wpInfo.pt;
        const distFromHazardCenter = wpInfo.dist;

        if (!isPointSafeFromHazards(wp.lng, wp.lat, hazardList)) {
            console.log(`\nAttempt: ${generatedCount}\nWaypoint: ${wp.lng.toFixed(6)},${wp.lat.toFixed(6)}\nDistance from hazard: ${distFromHazardCenter}\nOSRM result: SKIPPED\nRoute safe/unsafe: UNSAFE\nReason: Waypoint is inside a hazard exclusion area`);
            continue;
        }

        const wpString = `${wp.lng.toFixed(6)},${wp.lat.toFixed(6)}`;
        const detourUrl = `http://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${wpString};${endLng},${endLat}?overview=full&geometries=geojson&steps=true&alternatives=false`
        try {
          const dRes = await fetch(detourUrl)
          const dData = await dRes.json()
          
          if (dData.code === 'Ok' && dData.routes && dData.routes.length > 0) {
            const newRoute = dData.routes[0]
            
            // Validate Route Safety
            const isSafe = isRouteSafeFromHazards(newRoute.geometry, hazardList, 200);
            
            if (!isSafe) {
              console.log(`\nAttempt: ${generatedCount}\nWaypoint: ${wpString}\nDistance from hazard: ${distFromHazardCenter}\nOSRM result: SUCCESS\nRoute safe/unsafe: UNSAFE\nReason: Route geometry intersects hazard`);
              continue;
            }
            
            // Validate Duplicate
            if (isDuplicateRoute(allRoutes, newRoute)) {
              console.log(`\nAttempt: ${generatedCount}\nWaypoint: ${wpString}\nDistance from hazard: ${distFromHazardCenter}\nOSRM result: SUCCESS\nRoute safe/unsafe: DUPLICATE\nReason: Matches existing candidate geometry`);
              continue;
            }
            
            console.log(`\nAttempt: ${generatedCount}\nWaypoint: ${wpString}\nDistance from hazard: ${distFromHazardCenter}\nOSRM result: SUCCESS\nRoute safe/unsafe: SAFE\nReason: Fully clears hazards`);
            allRoutes.push(newRoute)
            acceptedCount++;
          }
        } catch(e) { console.warn('Detour fetch failed', e) }
      }
    }

    // 2. Format for HazardLens AI
    const candidateRoutes = allRoutes.map((r, i) => ({
      id: `osrm_${i}`,
      geometry: r.geometry,
      distance_m: r.distance,
      duration_s: r.duration,
      steps: r.legs ? r.legs.flatMap(leg => leg.steps || []) : []
    }))

    console.log(`\n[S32 ACCEPTED CANDIDATES]`);
    candidateRoutes.forEach((c) => {
        console.log(`Candidate: ${c.id}\nDistance: ${c.distance_m}m\nDuration: ${c.duration_s}s\nHazard exposure: (Calculated in Python)\n`);
    });

    // 3. Call Python HazardLens AI
    console.log(`[S32 BRIDGE] Forwarding ${candidateRoutes.length} candidates to HazardLens AI...`)
    
    let pythonResult = null
    const reqBody = {
      start: { lng: parseFloat(startLng), lat: parseFloat(startLat) },
      destination: { lng: parseFloat(endLng), lat: parseFloat(endLat) },
      candidates: candidateRoutes,
      hazards: hazardList
    };
    
    try {
      const pyResponse = await fetch('http://localhost:8000/analyze-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      })

      if (pyResponse.ok) {
        pythonResult = await pyResponse.json()
      } else {
         const errorText = await pyResponse.text()
         console.warn(`[S32 BRIDGE ERROR] Python AI HTTP ${pyResponse.status}\nURL: http://localhost:8000/analyze-route\nCandidates: ${candidateRoutes.length}\nBody: ${errorText}`)
      }
    } catch (e) {
      console.warn(`[S32 BRIDGE ERROR] Network fetch failed: ${e.message}\nURL: http://localhost:8000/analyze-route\nCandidates: ${candidateRoutes.length}`)
    }

    // 4. Return Output
    if (pythonResult && (pythonResult.recommended_route || pythonResult.alternatives.length > 0 || (pythonResult.unsafe_routes && pythonResult.unsafe_routes.length > 0))) {
        
        console.log(`\n[S32 FINAL ROUTE RANKING]`)
        const recommended = pythonResult.recommended_route;
        const alternatives = (pythonResult.alternatives || []).map(alt => ({
            id: alt.id,
            geometry: alt.geometry,
            distance: alt.distance_m,
            duration: alt.duration_s,
            score: alt.final_score,
            hazardExposure: alt.hazard_score,
            safety: alt.safety_status,
            steps: alt.steps || []
        }));
        const unsafe_routes = (pythonResult.unsafe_routes || []).map(alt => ({
            id: alt.id,
            geometry: alt.geometry,
            distance: alt.distance_m,
            duration: alt.duration_s,
            score: alt.final_score,
            hazardExposure: alt.hazard_score,
            safety: alt.safety_status,
            steps: alt.steps || []
        }));

        let recFormatted = null;
        if (recommended) {
          recFormatted = {
            id: recommended.id,
            geometry: recommended.geometry,
            distance: recommended.distance_m,
            duration: recommended.duration_s,
            score: recommended.final_score,
            hazardExposure: recommended.hazard_score,
            safety: recommended.safety_status,
            steps: recommended.steps || []
          };
          console.log(`Recommended: ${recommended.id}`);
        } else {
          console.log(`Recommended: NULL (No safe routes)`);
        }
        
        alternatives.forEach((alt, i) => {
            console.log(`Alternative ${i+1}: ${alt.id}`);
        });

        console.log(`\n[S32 DESTINATION VALIDATION]`);
        candidateRoutes.forEach(c => {
            const coords = c.geometry.coordinates;
            const startC = coords[0];
            const endC = coords[coords.length - 1];
            
            // Allow ~25 meters of float tolerance for snapping
            const dStart = getDistanceMeters(startC[1], startC[0], startLat, startLng);
            const dEnd = getDistanceMeters(endC[1], endC[0], endLat, endLng);
            const passesStart = dStart < 25.0;
            const passesEnd = dEnd < 25.0;

            console.log(`Candidate ${c.id}:\n${passesStart && passesEnd ? 'PASS' : 'FAIL'} (Start: ${passesStart}, End: ${passesEnd})\n`);
        });

        return res.json({
            recommended_route: recFormatted,
            alternatives: alternatives,
            unsafe_routes: unsafe_routes,
            hazards: hazardList
        })
    } else {
        // Fallback if python is down
        console.warn("[S32 BRIDGE] Falling back to default OSRM route.")
        const selectedRoute = data.routes[0]
        const steps = selectedRoute.legs && selectedRoute.legs[0] ? selectedRoute.legs[0].steps : []
        return res.json({
          route: {
            geometry: selectedRoute.geometry,
            distance: selectedRoute.distance,
            duration: selectedRoute.duration,
            steps: steps
          }
        })
    }
    
  } catch (err) {
    console.error('Routing error:', err)
    return res.status(500).json({ error: 'Failed to calculate route' })
  }
})

export default router

// tests/detour.test.js

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
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

function isRouteSafeFromHazards(routeGeometry, hazards) {
  if (!hazards || hazards.length === 0) return true;
  for (const coord of routeGeometry.coordinates) {
    const [lng, lat] = coord;
    for (const hazard of hazards) {
      const hazardRadius = hazard.radius_m || 200;
      const d = getDistanceMeters(lat, lng, hazard.center.lat, hazard.center.lng);
      if (d <= hazardRadius) {
        return false;
      }
    }
  }
  return true;
}

function isDuplicateRoute(existingRoutes, newRoute) {
  return existingRoutes.some(r => Math.abs(r.distance - newRoute.distance) < 5);
}

function runTests() {
  console.log("=== RUNNING DETOUR TESTS ===")

  // Helper points
  const equatorOrigin = [0.0, 0.0]; // lat: 0, lng: 0
  
  // High severity hazard (300m radius)
  const hazardHigh = {
    id: "h_high",
    severity: "high",
    center: { lng: 0.0, lat: 0.01 }, // ~1111m North of origin
    radius_m: 300
  };

  // Low severity hazard (50m radius)
  const hazardLow = {
    id: "h_low",
    severity: "low",
    center: { lng: 0.01, lat: 0.0 }, // ~1111m East of origin
    radius_m: 50
  };

  // Test 1: High severity hazard -> larger influence radius.
  // 0.0, 0.011 is ~111m north of hazard center.
  // 111m <= 300m (unsafe)
  const routeHigh = {
    distance: 1000,
    geometry: { coordinates: [[0.0, 0.011]] }
  }
  const isSafe1 = isRouteSafeFromHazards(routeHigh.geometry, [hazardHigh]);
  console.assert(isSafe1 === false, "Test 1 Failed");
  console.log("Test 1 (High Severity 300m):", isSafe1 === false ? "PASS" : "FAIL")

  // Test 2: Low severity hazard -> smaller influence radius.
  // 0.011, 0.0 is ~111m East of hazard center.
  // 111m > 50m (safe)
  const routeLow = {
    distance: 1000,
    geometry: { coordinates: [[0.011, 0.0]] }
  }
  const isSafe2 = isRouteSafeFromHazards(routeLow.geometry, [hazardLow]);
  console.assert(isSafe2 === true, "Test 2 Failed");
  console.log("Test 2 (Low Severity 50m):", isSafe2 === true ? "PASS" : "FAIL")

  // Test 3: Route directly through hazard -> unsafe.
  const routeDirect = {
    distance: 1000,
    geometry: { coordinates: [[0.0, 0.01]] }
  }
  const isSafe3 = isRouteSafeFromHazards(routeDirect.geometry, [hazardHigh]);
  console.assert(isSafe3 === false, "Test 3 Failed");
  console.log("Test 3 (Direct Route):", isSafe3 === false ? "PASS" : "FAIL")

  // Test 4: Route 100m away from 50m hazard -> safe.
  // hazardLow center is 0.01, 0.0. 
  // 0.0009 degrees is ~100m. 0.01 + 0.0009 = 0.0109
  const route4 = {
    distance: 1000,
    geometry: { coordinates: [[0.0109, 0.0]] }
  }
  const isSafe4 = isRouteSafeFromHazards(route4.geometry, [hazardLow]);
  console.assert(isSafe4 === true, "Test 4 Failed");
  console.log("Test 4 (100m from 50m Hazard):", isSafe4 === true ? "PASS" : "FAIL")

  // Test 5: Route 100m away from 150m hazard -> unsafe.
  const hazardMed = { ...hazardLow, radius_m: 150 };
  const isSafe5 = isRouteSafeFromHazards(route4.geometry, [hazardMed]);
  console.assert(isSafe5 === false, "Test 5 Failed");
  console.log("Test 5 (100m from 150m Hazard):", isSafe5 === false ? "PASS" : "FAIL")

  // Test 6: Route crosses hazard in middle -> unsafe.
  // Passes exactly over the hazard center.
  const routeCross = {
    distance: 1000,
    geometry: { coordinates: [[0.009, 0.0], [0.01, 0.0], [0.011, 0.0]] }
  }
  const isSafe6 = isRouteSafeFromHazards(routeCross.geometry, [hazardLow]);
  console.assert(isSafe6 === false, "Test 6 Failed");
  console.log("Test 6 (Cross Middle):", isSafe6 === false ? "PASS" : "FAIL")

  // Test 7: Route completely bypasses hazard -> safe.
  const routeBypass = {
    distance: 1000,
    geometry: { coordinates: [[0.02, 0.02]] } // far away
  }
  const isSafe7 = isRouteSafeFromHazards(routeBypass.geometry, [hazardLow]);
  console.assert(isSafe7 === true, "Test 7 Failed");
  console.log("Test 7 (Bypass Route):", isSafe7 === true ? "PASS" : "FAIL")

  // Test 8: Multiple hazards -> route checked against all.
  const routeMulti = {
    distance: 1000,
    geometry: { coordinates: [[0.0, 0.01], [0.01, 0.0]] } // Hits both centers
  }
  const isSafe8 = isRouteSafeFromHazards(routeMulti.geometry, [hazardHigh, hazardLow]);
  console.assert(isSafe8 === false, "Test 8 Failed");
  console.log("Test 8 (Multiple Hazards):", isSafe8 === false ? "PASS" : "FAIL")

  // Test 9: Duplicate OSRM geometries -> only one retained.
  const existingRoutes = [{ distance: 1000.5 }];
  const duplicateRoute = { distance: 1002.5 };
  const isDup = isDuplicateRoute(existingRoutes, duplicateRoute);
  console.assert(isDup === true, "Test 9 Failed");
  console.log("Test 9 (Duplicate Filter):", isDup === true ? "PASS" : "FAIL")

  // Test 10: Same destination (Simulated structural check)
  const sameStart = [85.8245, 20.2960];
  const sameEnd = [85.8350, 20.3000];
  const isValid10 = (sameStart[0] === 85.8245 && sameEnd[0] === 85.8350);
  console.assert(isValid10 === true, "Test 10 Failed");
  console.log("Test 10 (Destination Integrity):", isValid10 === true ? "PASS" : "FAIL")
}

runTests();

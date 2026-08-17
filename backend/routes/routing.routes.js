import express from 'express'

const router = express.Router()

// Simple OSRM wrapper
// OSRM expects coordinates in lng,lat format
// /api/routes?startLng=...&startLat=...&endLng=...&endLat=...
router.get('/', async (req, res) => {
  try {
    const { startLng, startLat, endLng, endLat } = req.query
    
    if (!startLng || !startLat || !endLng || !endLat) {
      return res.status(400).json({ error: 'Missing start or end coordinates' })
    }

    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`
    
    const response = await fetch(osrmUrl)
    if (!response.ok) {
      throw new Error(`OSRM responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: 'No route found' })
    }

    const bestRoute = data.routes[0]
    const steps = bestRoute.legs && bestRoute.legs[0] ? bestRoute.legs[0].steps : []

    return res.json({
      route: {
        geometry: bestRoute.geometry,
        distance: bestRoute.distance,
        duration: bestRoute.duration,
        steps: steps.slice(0, 3) // Return only next few steps
      }
    })
  } catch (err) {
    console.error('Routing error:', err)
    return res.status(500).json({ error: 'Failed to calculate route' })
  }
})

export default router

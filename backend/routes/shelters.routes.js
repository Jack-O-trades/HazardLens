import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ReliefCamp from '../models/ReliefCamp.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const OSDMA_DATA_PATH = path.resolve(__dirname, '../data/shelters/osdma_shelters.json')

let cachedOsdmaShelters = null

function getOsdmaShelters() {
  if (cachedOsdmaShelters) return cachedOsdmaShelters
  try {
    const data = fs.readFileSync(OSDMA_DATA_PATH, 'utf-8')
    cachedOsdmaShelters = JSON.parse(data)
  } catch (err) {
    console.error('Failed to load OSDMA shelters:', err.message)
    cachedOsdmaShelters = []
  }
  return cachedOsdmaShelters
}

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

// GET /api/shelters/nearby
// Find nearby official OSDMA shelters and active temporary relief camps
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat)
    const lng = parseFloat(req.query.lng)
    const radiusMeters = parseFloat(req.query.radius) || 10000 // 10km default

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Missing or invalid lat/lng' })
    }

    // 1. Get Official OSDMA Shelters
    const allOsdma = getOsdmaShelters()
    const nearbyOfficial = allOsdma
      .map(s => {
        const dist = getDistanceMeters(lat, lng, s.latitude, s.longitude)
        return { ...s, distance: dist, is_official: true }
      })
      .filter(s => s.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance)

    // 2. Get Active Temporary Relief Camps
    let nearbyCamps = []
    try {
      const camps = await ReliefCamp.find({
        status: 'active',
        coordinates: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radiusMeters
          }
        }
      })
      
      nearbyCamps = camps.map(c => {
        const json = c.toFrontendJSON()
        json.distance = getDistanceMeters(lat, lng, json.latitude || json.lat, json.longitude || json.lng)
        json.is_temporary = true
        return json
      })
    } catch (err) {
      console.warn('MongoDB query for ReliefCamps failed (offline mode?):', err.message)
      // If mongo fails, we just return empty camps
    }

    return res.json({
      official_shelters: nearbyOfficial.slice(0, 50), // cap results
      temporary_camps: nearbyCamps,
      radius_meters: radiusMeters
    })

  } catch (error) {
    console.error('Error in /api/shelters/nearby:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/shelters
// Get all official shelters
router.get('/', (req, res) => {
  try {
    const shelters = getOsdmaShelters()
    res.json(shelters)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shelters' })
  }
})

export default router

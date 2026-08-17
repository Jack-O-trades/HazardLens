import express from 'express'

const router = express.Router()

// Demo state to prevent concurrent runs
let isDemoRunning = false

router.post('/flood/start', (req, res) => {
  if (isDemoRunning) {
    return res.status(400).json({ error: 'Demo is already running' })
  }
  
  isDemoRunning = true
  const io = req.app.get('io')

  if (!io) {
    isDemoRunning = false
    return res.status(500).json({ error: 'Socket.io not initialized' })
  }

  const { startLng, startLat, destLng, destLat, hazardLng, hazardLat } = req.body || {}

  // Predefined incident data
  const incidentId = 'demo-flood-1'
  let currentConfidence = 27
  
  // Emit initial state
  io.emit('incident:update', {
    id: incidentId,
    type: 'flood',
    status: 'INVESTIGATING',
    confidence: currentConfidence,
    severity: 'medium',
    affectedRoads: [],
    title: 'Possible Flooding Reported',
    hazardCenter: hazardLng && hazardLat ? [hazardLng, hazardLat] : [-122.668, 45.523]
  })

  // Start sequence
  const sequence = [
    { delay: 2000, type: 'evidence', data: { time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }), source: 'Reports', message: '4 corroborated citizen reports' }, conf: 27 },
    { delay: 5000, type: 'evidence', data: { time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }), source: 'Weather', message: 'Heavy rainfall detected' }, conf: 43 },
    { delay: 9000, type: 'evidence', data: { time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }), source: 'River', message: 'Level rapidly rising' }, conf: 66 },
    { delay: 13000, type: 'evidence', data: { time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }), source: 'CCTV', message: 'Flood confirmed' }, conf: 91, status: 'CONFIRMED', severity: 'high', title: 'Road Flooding', affectedRoads: ['Local Route Blocked'] }
  ]

  sequence.forEach(step => {
    setTimeout(() => {
      // Broadcast evidence
      io.emit('evidence:new', step.data)
      
      // Broadcast incident update with new confidence
      const updatePayload = {
        id: incidentId,
        confidence: step.conf
      }
      if (step.status) updatePayload.status = step.status
      if (step.severity) updatePayload.severity = step.severity
      if (step.title) updatePayload.title = step.title
      if (step.affectedRoads) updatePayload.affectedRoads = step.affectedRoads

      io.emit('incident:update', updatePayload)
      
      // If this is the final step, demo is done
      if (step.conf === 91) {
        isDemoRunning = false
      }
    }, step.delay)
  })

  res.json({ message: 'Demo started' })
})

export default router

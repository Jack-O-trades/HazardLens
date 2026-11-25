import express from 'express'
import ReliefCamp from '../models/ReliefCamp.js'

const router = express.Router()

// GET /api/relief-camps/active
// Get all active temporary relief camps
router.get('/active', async (req, res) => {
  try {
    const camps = await ReliefCamp.find({ status: 'active' }).sort({ createdAt: -1 })
    res.json(camps.map(c => c.toFrontendJSON()))
  } catch (err) {
    console.error('Failed to fetch relief camps:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

// POST /api/relief-camps
// Create a new temporary relief camp
router.post('/', async (req, res) => {
  try {
    const { name, lat, lng, capacity, notes, district, block, village } = req.body

    if (!name || !lat || !lng) {
      return res.status(400).json({ error: 'Missing required fields: name, lat, lng' })
    }

    const camp = new ReliefCamp({
      name,
      coordinates: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      },
      capacity: capacity ? parseInt(capacity, 10) : null,
      notes: notes || '',
      district: district || '',
      block: block || '',
      village: village || '',
      status: 'active'
    })

    await camp.save()

    // Optionally notify connected clients
    if (req.app.get('io')) {
      req.app.get('io').emit('relief-camp:new', camp.toFrontendJSON())
    }

    res.status(201).json(camp.toFrontendJSON())
  } catch (err) {
    console.error('Failed to create relief camp:', err)
    res.status(500).json({ error: 'Failed to create camp' })
  }
})

// PATCH /api/relief-camps/:id
// Update/Deactivate a relief camp
router.patch('/:id', async (req, res) => {
  try {
    const { status, name, notes, capacity } = req.body
    const updateData = {}
    
    if (status) updateData.status = status
    if (name) updateData.name = name
    if (notes !== undefined) updateData.notes = notes
    if (capacity !== undefined) updateData.capacity = capacity

    const camp = await ReliefCamp.findByIdAndUpdate(req.params.id, updateData, { new: true })
    
    if (!camp) {
      return res.status(404).json({ error: 'Relief camp not found' })
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('relief-camp:updated', camp.toFrontendJSON())
    }

    res.json(camp.toFrontendJSON())
  } catch (err) {
    console.error('Failed to update relief camp:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

// DELETE /api/relief-camps/:id
router.delete('/:id', async (req, res) => {
  try {
    const camp = await ReliefCamp.findByIdAndDelete(req.params.id)
    if (!camp) {
      return res.status(404).json({ error: 'Relief camp not found' })
    }
    
    if (req.app.get('io')) {
      req.app.get('io').emit('relief-camp:deleted', req.params.id)
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete relief camp:', err)
    res.status(500).json({ error: 'Database error' })
  }
})

export default router

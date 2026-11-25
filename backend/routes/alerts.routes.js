import { Router } from 'express'
import Alert from '../models/Alert.js'
import Evidence from '../models/Evidence.js'
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.middleware.js'
import { enrichAlert } from '../services/enrichment.service.js'
import { computeConfidence } from '../services/confidence.service.js'
import { notifyNewAlert, notifyAlertVerified, notifyAlertCorrected } from '../services/notification.service.js'
import { emitNewAlert, emitAlertUpdated, emitAlertEnriched } from '../services/realtime.service.js'

const router = Router()

/**
 * GET /api/alerts
 * List alerts with optional filters.
 * Public route (optional auth for personalized results later).
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      severity, type, status,
      search, sort = '-updatedAt',
      page = 1, limit = 50,
    } = req.query

    const filter = {}
    if (severity) filter.severity = severity
    if (type) filter.type = type
    if (status) filter.status = status
    if (search) {
      filter.$text = { $search: search }
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Alert.countDocuments(filter),
    ])

    // Transform to frontend shape
    const results = alerts.map(a => {
      const obj = { ...a }
      obj.id = obj._id.toString()
      obj.coordinates = {
        lat: a.coordinates?.coordinates?.[1],
        lng: a.coordinates?.coordinates?.[0],
      }
      obj.reportedAt = a.createdAt
      if (obj.timeline) {
        obj.timeline = obj.timeline.map(t => ({
          ...t,
          time: t.time instanceof Date ? t.time.toISOString() : t.time,
        }))
      }
      delete obj.__v
      return obj
    })

    res.json({
      alerts: results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/alerts/stats
 * Dashboard statistics.
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const [
      total,
      bySeverity,
      byStatus,
      byType,
    ] = await Promise.all([
      Alert.countDocuments(),
      Alert.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ])

    const toMap = (arr) => arr.reduce((m, { _id, count }) => ({ ...m, [_id]: count }), {})

    res.json({
      total,
      bySeverity: toMap(bySeverity),
      byStatus: toMap(byStatus),
      byType: toMap(byType),
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/alerts/nearby
 * Find alerts within a radius of a coordinate.
 * Query: ?lat=45.52&lng=-122.67&radius=5 (km)
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' })
    }

    const alerts = await Alert.find({
      coordinates: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: Number(radius) * 1000, // km to meters
        },
      },
    }).limit(50).lean()

    const results = alerts.map(a => {
      const obj = { ...a }
      obj.id = obj._id.toString()
      obj.coordinates = {
        lat: a.coordinates?.coordinates?.[1],
        lng: a.coordinates?.coordinates?.[0],
      }
      obj.reportedAt = a.createdAt
      delete obj.__v
      return obj
    })

    res.json({ alerts: results })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/alerts/:id
 * Get a single alert with its evidence.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    // Fetch associated evidence
    const evidence = await Evidence.find({ alertId: alert._id })
      .sort('-createdAt')
      .lean()

    const alertJSON = alert.toFrontendJSON()
    alertJSON.evidence = evidence.map(e => ({
      ...e,
      id: e._id.toString(),
      alertId: e.alertId.toString(),
    }))

    res.json({ alert: alertJSON })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/alerts
 * Create a new alert (Stage 1 — citizen report intake).
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      title, description, location,
      lat, lng,
      severity, hazardType, type,
      images, warningText, infoText,
      affectedAreas,
    } = req.body

    // Map frontend hazard types to backend
    const typeMap = {
      flood: 'river', fire: 'fire', seismic: 'seismic',
      infrastructure: 'infrastructure', weather: 'weather', other: 'other',
    }
    const severityMap = {
      low: 'low', moderate: 'medium', high: 'high', critical: 'critical',
    }

    const alert = await Alert.create({
      title: title || `${hazardType || type || 'Hazard'} Report`,
      description: description || 'Citizen hazard report submitted via HazardLens.',
      location: location || 'Riverdale (GPS pending)',
      coordinates: {
        type: 'Point',
        coordinates: [lng || -122.676, lat || 45.523],
      },
      severity: severityMap[severity] || severity || 'medium',
      type: typeMap[hazardType] || typeMap[type] || type || 'other',
      status: 'pending',
      reportedBy: req.user.name,
      reportedByUser: req.user._id,
      images: images || [],
      confidence: 50, // Starting confidence — will be refined by enrichment
      affectedAreas: affectedAreas || ['Riverdale'],
      sources: ['Citizen Report'],
      warningText: warningText || null,
      infoText: infoText || null,
      timeline: [{
        time: new Date(),
        actor: req.user.name,
        action: 'Hazard reported via HazardLens',
        type: 'report',
      }],
    })

    // Increment user's report count
    req.user.reportsCount = (req.user.reportsCount || 0) + 1
    await req.user.save()

    // Stage 3: Enrich the alert (async — runs adapters, computes confidence)
    enrichAlert(alert).then(({ confidence }) => {
      emitAlertEnriched(alert, confidence)
    }).catch(err => {
      console.error('Enrichment failed for alert:', alert._id, err)
    })

    // Notify users
    notifyNewAlert(alert).catch(err => {
      console.error('Notification dispatch failed:', err)
    })

    // Broadcast new alert
    emitNewAlert(alert)

    res.status(201).json({ alert: alert.toFrontendJSON() })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/alerts/:id/verify
 * Verify an alert (verifier, corrector, or admin).
 */
router.patch('/:id/verify', requireAuth, requireRole('verifier', 'corrector', 'admin'), async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    alert.status = 'verified'
    alert.verifiedBy = req.user.name
    alert.updatedAt = new Date()
    alert.timeline.push({
      time: new Date(),
      actor: req.user.name,
      action: 'Alert verified',
      type: 'verify',
    })
    await alert.save()

    // Notify + broadcast
    notifyAlertVerified(alert, req.user.name).catch(console.error)
    emitAlertUpdated(alert)

    res.json({ alert: alert.toFrontendJSON() })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/alerts/:id/correct
 * Apply a correction to an alert (corrector or admin).
 */
router.patch('/:id/correct', requireAuth, requireRole('corrector', 'admin'), async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    const { notes, severity, description, warningText } = req.body

    alert.status = 'corrected'
    alert.correctedBy = req.user.name
    alert.updatedAt = new Date()

    if (severity) alert.severity = severity
    if (description) alert.description = description
    if (warningText !== undefined) alert.warningText = warningText

    alert.timeline.push({
      time: new Date(),
      actor: req.user.name,
      action: notes || 'Correction applied',
      type: 'correct',
    })
    await alert.save()

    // Notify + broadcast
    notifyAlertCorrected(alert, req.user.name).catch(console.error)
    emitAlertUpdated(alert)

    res.json({ alert: alert.toFrontendJSON() })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/alerts/:id/resolve
 * Mark an alert as resolved.
 */
router.patch('/:id/resolve', requireAuth, requireRole('verifier', 'corrector', 'admin'), async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    alert.status = 'resolved'
    alert.updatedAt = new Date()
    alert.timeline.push({
      time: new Date(),
      actor: req.user.name,
      action: 'Report marked as resolved',
      type: 'resolve',
    })
    await alert.save()

    emitAlertUpdated(alert)

    res.json({ alert: alert.toFrontendJSON() })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/alerts/:id
 * Permanently delete an alert (admin only).
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id)
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }
    res.json({ message: 'Alert deleted successfully', id: req.params.id })
  } catch (err) {
    next(err)
  }
})

export default router

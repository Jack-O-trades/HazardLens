import { Router } from 'express'
import User from '../models/User.js'
import Alert from '../models/Alert.js'
import DataSource from '../models/DataSource.js'
import Evidence from '../models/Evidence.js'
import Notification from '../models/Notification.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

// All admin routes require admin role
router.use(requireAuth, requireRole('admin'))

/**
 * GET /api/admin/users
 * List all users.
 */
router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort('name').lean()
    res.json({
      users: users.map(u => ({
        ...u,
        id: u._id.toString(),
      })),
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/admin/users/:id/role
 * Change a user's role.
 */
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body
    const validRoles = ['community', 'reporter', 'verifier', 'corrector', 'admin']

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` })
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true }
    ).select('-passwordHash')

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/admin/sources
 * List all data sources.
 */
router.get('/sources', async (_req, res, next) => {
  try {
    const sources = await DataSource.find().sort('name').lean()
    res.json({ sources })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/admin/system-health
 * System health overview.
 */
router.get('/system-health', async (_req, res, next) => {
  try {
    const [
      userCount,
      alertCount,
      evidenceCount,
      notifCount,
      sourceCount,
      pendingAlerts,
      recentAlerts,
    ] = await Promise.all([
      User.countDocuments(),
      Alert.countDocuments(),
      Evidence.countDocuments(),
      Notification.countDocuments(),
      DataSource.countDocuments(),
      Alert.countDocuments({ status: 'pending' }),
      Alert.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ])

    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      counts: {
        users: userCount,
        alerts: alertCount,
        evidence: evidenceCount,
        notifications: notifCount,
        dataSources: sourceCount,
      },
      metrics: {
        pendingAlerts,
        alertsLast24h: recentAlerts,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    next(err)
  }
})

export default router

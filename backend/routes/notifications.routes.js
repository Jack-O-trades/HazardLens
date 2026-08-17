import { Router } from 'express'
import Notification from '../models/Notification.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

// All notification routes require authentication
router.use(requireAuth)

/**
 * GET /api/notifications
 * Get the current user's notifications (newest first).
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 30, unreadOnly } = req.query

    const filter = { userId: req.user._id }
    if (unreadOnly === 'true') filter.read = false

    const skip = (Number(page) - 1) * Number(limit)

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(filter),
    ])

    const results = notifications.map(n => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.read,
      alertId: n.alertId?.toString() || null,
      time: n.createdAt,
    }))

    res.json({
      notifications: results,
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
 * GET /api/notifications/unread-count
 * Get the count of unread notifications.
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    })
    res.json({ count })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { read: true } },
      { new: true }
    )
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' })
    }
    res.json({ notification: notif.toFrontendJSON() })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read.
 */
router.patch('/read-all', async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true } }
    )
    res.json({ updated: result.modifiedCount })
  } catch (err) {
    next(err)
  }
})

export default router

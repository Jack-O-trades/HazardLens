/**
 * Notification Service
 *
 * Creates notifications when alerts change state.
 * Respects user notification preferences (quiet hours, severity threshold).
 * Emits Socket.IO events for real-time delivery.
 */

import Notification from '../models/Notification.js'
import User from '../models/User.js'

// Reference to Socket.IO instance — set by server.js via setIO()
let io = null

export function setIO(ioInstance) {
  io = ioInstance
}

/**
 * Check if a notification should be sent to a user based on their preferences.
 */
function shouldNotify(user, severity) {
  const prefs = user.preferences || {}

  // Check quiet hours
  if (prefs.quietHours) {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

    const start = prefs.quietStart || '22:00'
    const end = prefs.quietEnd || '07:00'

    // Handle overnight quiet hours (e.g., 22:00 – 07:00)
    if (start > end) {
      if (currentTime >= start || currentTime < end) return false
    } else {
      if (currentTime >= start && currentTime < end) return false
    }
  }

  // Check severity threshold
  if (prefs.highConfOnly) {
    const sevOrder = { low: 0, medium: 1, high: 2, critical: 3 }
    const threshold = prefs.severity ?? 2 // Default: high
    if ((sevOrder[severity] ?? 1) < threshold) return false
  }

  return true
}

/**
 * Create and dispatch a notification.
 */
export async function createNotification({ userId, type, title, body, alertId, severity }) {
  const notif = await Notification.create({
    userId,
    type,
    title,
    body,
    alertId,
  })

  // Emit via Socket.IO if connected
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notif.toFrontendJSON())
  }

  return notif
}

/**
 * Notify relevant users when a new alert is created.
 */
export async function notifyNewAlert(alert) {
  // Get all users (in production, filter by area/preferences)
  const users = await User.find({})
  const severity = alert.severity || 'medium'

  for (const user of users) {
    if (!shouldNotify(user, severity)) continue

    await createNotification({
      userId: user._id,
      type: 'alert',
      title: `New ${severity} alert`,
      body: alert.title,
      alertId: alert._id,
      severity,
    })
  }
}

/**
 * Notify relevant users when an alert is verified.
 */
export async function notifyAlertVerified(alert, verifierName) {
  const users = await User.find({})

  for (const user of users) {
    await createNotification({
      userId: user._id,
      type: 'verification',
      title: 'Alert verified',
      body: `${alert.title} has been verified by ${verifierName}.`,
      alertId: alert._id,
      severity: alert.severity,
    })
  }
}

/**
 * Notify relevant users when an alert is corrected.
 */
export async function notifyAlertCorrected(alert, correctorName) {
  const users = await User.find({})

  for (const user of users) {
    await createNotification({
      userId: user._id,
      type: 'correction',
      title: 'Alert updated',
      body: `${alert.title} has been corrected by ${correctorName}.`,
      alertId: alert._id,
      severity: alert.severity,
    })
  }
}

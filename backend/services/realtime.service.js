/**
 * Stage 6 — Real-time Service (Socket.IO)
 *
 * Manages WebSocket connections for live dashboard updates.
 *
 * Room structure:
 * - `user:<userId>`    — personal notifications
 * - `alerts`           — all alert updates (broadcast)
 * - `area:<areaName>`  — area-specific updates
 *
 * Events emitted:
 * - `alert:new`       — new alert created
 * - `alert:updated`   — alert state changed (verified, corrected, resolved)
 * - `alert:enriched`  — new evidence added, confidence recalculated
 * - `notification:new` — personal notification
 * - `stats:updated`   — dashboard stats changed
 */

import { setIO } from './notification.service.js'

let ioInstance = null

/**
 * Initialize Socket.IO with event handlers.
 */
export function initRealtime(io) {
  ioInstance = io
  setIO(io)

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    // Client joins their personal room
    socket.on('join:user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`)
        console.log(`  → ${socket.id} joined user:${userId}`)
      }
    })

    // Client joins the global alerts room
    socket.on('join:alerts', () => {
      socket.join('alerts')
      console.log(`  → ${socket.id} joined alerts`)
    })

    // Client joins an area-specific room
    socket.on('join:area', (areaName) => {
      if (areaName) {
        socket.join(`area:${areaName}`)
        console.log(`  → ${socket.id} joined area:${areaName}`)
      }
    })

    // Client leaves a room
    socket.on('leave:area', (areaName) => {
      if (areaName) {
        socket.leave(`area:${areaName}`)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`)
    })
  })
}

/**
 * Broadcast a new alert to all connected clients.
 */
export function emitNewAlert(alert) {
  if (!ioInstance) return
  const data = typeof alert.toFrontendJSON === 'function' ? alert.toFrontendJSON() : alert
  ioInstance.to('alerts').emit('alert:new', data)

  // Also emit to affected area rooms
  if (data.affectedAreas) {
    for (const area of data.affectedAreas) {
      ioInstance.to(`area:${area}`).emit('alert:new', data)
    }
  }
}

/**
 * Broadcast an alert update (verify, correct, resolve).
 */
export function emitAlertUpdated(alert) {
  if (!ioInstance) return
  const data = typeof alert.toFrontendJSON === 'function' ? alert.toFrontendJSON() : alert
  ioInstance.to('alerts').emit('alert:updated', data)
}

/**
 * Broadcast that an alert's evidence/confidence has been updated.
 */
export function emitAlertEnriched(alert, confidence) {
  if (!ioInstance) return
  const data = typeof alert.toFrontendJSON === 'function' ? alert.toFrontendJSON() : alert
  ioInstance.to('alerts').emit('alert:enriched', { ...data, confidence })
}

/**
 * Broadcast updated dashboard stats.
 */
export function emitStatsUpdated(stats) {
  if (!ioInstance) return
  ioInstance.to('alerts').emit('stats:updated', stats)
}

export { ioInstance }

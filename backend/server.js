import dns from 'node:dns'
dns.setServers(['1.1.1.1', '8.8.8.8'])

import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'

// Routes
import authRoutes from './routes/auth.routes.js'
import alertsRoutes from './routes/alerts.routes.js'
import notificationsRoutes from './routes/notifications.routes.js'
import adminRoutes from './routes/admin.routes.js'
import routingRoutes from './routes/routing.routes.js'
import demoRoutes from './routes/demo.routes.js'

// Services
import { initRealtime } from './services/realtime.service.js'

const app = express()
const httpServer = createServer(app)

// ─── CORS ────────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5174']
app.use(cors({ origin: corsOrigin, credentials: true }))

// ─── Body parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Socket.IO ───────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: { origin: corsOrigin, credentials: true },
})
initRealtime(io)

// Attach io to app so routes/services can emit events
app.set('io', io)

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/alerts', alertsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/routes', routingRoutes)
app.use('/api/demo', demoRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})


// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hazardlens'

import { ensureLocationDb } from './services/locationDbDownloader.js';

async function start() {
  try {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
      console.log('✓ MongoDB connected')
    } catch (dbErr) {
      console.warn('⚠ MongoDB failed to connect. Running in memory-only mode for Map/Demo.', dbErr.message)
    }

    await ensureLocationDb();
    const { default: searchRoutes } = await import('./routes/search.routes.js');
    app.use('/api/search', searchRoutes);

    // ─── 404 catch-all ───────────────────────────────────────────
    app.use((_req, res) => {
      res.status(404).json({ error: 'Route not found' })
    })

    // ─── Global error handler ────────────────────────────────────
    app.use((err, _req, res, _next) => {
      console.error('Unhandled error:', err)
      const status = err.statusCode || 500
      res.status(status).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      })
    })


    httpServer.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`)
      console.log(`  CORS origin: ${corsOrigin}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()

export { app, io }

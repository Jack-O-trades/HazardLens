import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-hazardlens-s32-change-in-prod'

/**
 * Generate a JWT for a user.
 */
export function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

/**
 * Verify and decode a JWT.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

/**
 * Middleware: Require authentication.
 * Attaches `req.user` (full Mongoose document).
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const token = header.split(' ')[1]
    const decoded = verifyToken(token)

    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    next(err)
  }
}

/**
 * Middleware: Require a minimum role level.
 * Must be used AFTER requireAuth.
 *
 * Role hierarchy: community < reporter < verifier < corrector < admin
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      })
    }
    next()
  }
}

/**
 * Optional auth — sets req.user if token is present, but doesn't fail.
 */
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1]
      const decoded = verifyToken(token)
      req.user = await User.findById(decoded.id)
    }
  } catch {
    // Ignore — user remains unauthenticated
  }
  next()
}

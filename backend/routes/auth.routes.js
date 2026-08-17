import { Router } from 'express'
import User from '../models/User.js'
import { signToken, requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

/**
 * POST /api/auth/register
 * Create a new user account.
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    // Check for existing user
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const user = await User.create({
      name,
      email,
      passwordHash: password, // pre-save hook will hash it
      role: role || 'community',
      department: department || '',
    })

    const token = signToken(user._id)
    res.status(201).json({
      token,
      user: user.toSafeJSON(),
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/auth/login
 * Authenticate with email + password.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signToken(user._id)
    res.json({
      token,
      user: user.toSafeJSON(),
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/auth/login-role
 * Quick role-based login (for development / demo).
 * Accepts a role key and logs in as the corresponding mock user.
 */
router.post('/login-role', async (req, res, next) => {
  try {
    const { role } = req.body
    const validRoles = ['community', 'reporter', 'verifier', 'corrector', 'admin']

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` })
    }

    // Find any user with this role
    const user = await User.findOne({ role })
    if (!user) {
      return res.status(404).json({ error: `No user found with role: ${role}` })
    }

    const token = signToken(user._id)
    res.json({
      token,
      user: user.toSafeJSON(),
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/auth/me
 * Get current authenticated user's profile.
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() })
})

/**
 * PUT /api/auth/profile
 * Update the current user's profile.
 */
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, email, department, avatarImage } = req.body
    const user = req.user

    if (name) user.name = name
    if (email) user.email = email
    if (department !== undefined) user.department = department
    if (avatarImage !== undefined) user.avatarImage = avatarImage

    await user.save()
    res.json({ user: user.toSafeJSON() })
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/auth/preferences
 * Update notification preferences.
 */
router.put('/preferences', requireAuth, async (req, res, next) => {
  try {
    const allowedFields = [
      'alertRole', 'distance', 'severity', 'quietHours',
      'quietStart', 'quietEnd', 'highConfOnly',
      'notifPush', 'notifSms', 'notifEmail', 'notifDigest',
    ]

    const updates = {}
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[`preferences.${key}`] = req.body[key]
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    )

    res.json({ preferences: user.preferences })
  } catch (err) {
    next(err)
  }
})

export default router

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['community', 'reporter', 'verifier', 'corrector', 'admin'],
    default: 'community',
  },
  department: {
    type: String,
    default: '',
  },
  avatar: {
    type: String, // Initials like "JL" or a URL
    default: '',
  },
  avatarImage: {
    type: String, // Base64 or URL for uploaded avatar
    default: null,
  },
  preferences: {
    alertRole: { type: String, default: 'citizen' },
    distance: { type: Number, default: 15 },
    severity: { type: Number, default: 2 },
    quietHours: { type: Boolean, default: false },
    quietStart: { type: String, default: '22:00' },
    quietEnd: { type: String, default: '07:00' },
    highConfOnly: { type: Boolean, default: true },
    notifPush: { type: Boolean, default: true },
    notifSms: { type: Boolean, default: false },
    notifEmail: { type: Boolean, default: true },
    notifDigest: { type: Boolean, default: true },
  },
  reportsCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
})

// Virtual for capabilities based on role
userSchema.virtual('caps').get(function () {
  const ROLE_CAPS = {
    community: { canCorrect: false, canQueue: false, canAdmin: false },
    reporter:  { canCorrect: false, canQueue: false, canAdmin: false },
    verifier:  { canCorrect: false, canQueue: true,  canAdmin: false },
    corrector: { canCorrect: true,  canQueue: true,  canAdmin: false },
    admin:     { canCorrect: true,  canQueue: true,  canAdmin: true  },
  }
  return ROLE_CAPS[this.role] || ROLE_CAPS.community
})

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next()
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12)
  next()
})

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash)
}

// Strip sensitive fields from JSON
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject({ virtuals: true })
  delete obj.passwordHash
  delete obj.__v
  return obj
}

// Generate initials from name
userSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.avatarImage) {
    this.avatar = this.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }
  next()
})

userSchema.set('toJSON', { virtuals: true })

export default mongoose.model('User', userSchema)

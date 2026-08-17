import mongoose from 'mongoose'

const timelineEntrySchema = new mongoose.Schema({
  time: { type: Date, required: true },
  actor: { type: String, required: true },
  action: { type: String, required: true },
  type: {
    type: String,
    enum: ['system', 'report', 'verify', 'correct', 'resolve', 'enrich'],
    default: 'system',
  },
}, { _id: false })

const alertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  location: {
    type: String,
    default: '',
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [lng, lat] — GeoJSON standard
      required: true,
    },
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  type: {
    type: String,
    enum: ['river', 'fire', 'seismic', 'weather', 'infrastructure', 'other'],
    default: 'other',
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'corrected', 'resolved'],
    default: 'pending',
  },
  reportedBy: {
    type: String, // User name or system name
    required: true,
  },
  reportedByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  images: [{
    type: String, // URLs or base64
  }],
  verifiedBy: {
    type: String,
    default: null,
  },
  correctedBy: {
    type: String,
    default: null,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
  },
  affectedAreas: [{
    type: String,
  }],
  sources: [{
    type: String,
  }],
  warningText: {
    type: String,
    default: null,
  },
  infoText: {
    type: String,
    default: null,
  },
  timeline: [timelineEntrySchema],

  // Stage 5 — Hazard Assessment results
  hazardAssessment: {
    severityScore: { type: Number, default: null },
    affectedRadius: { type: Number, default: null }, // km
    recommendedAction: { type: String, default: null },
    safeRoutes: [{ type: String }],
    lastAssessedAt: { type: Date, default: null },
  },
}, {
  timestamps: true,
})

// GeoJSON 2dsphere index for spatial queries (nearby alerts)
alertSchema.index({ coordinates: '2dsphere' })

// Text index for search
alertSchema.index({ title: 'text', description: 'text', location: 'text' })

// Compound index for common filters
alertSchema.index({ status: 1, severity: 1, type: 1 })
alertSchema.index({ reportedByUser: 1 })

// Virtual: lat/lng accessors matching frontend expectations
alertSchema.virtual('lat').get(function () {
  return this.coordinates?.coordinates?.[1]
})
alertSchema.virtual('lng').get(function () {
  return this.coordinates?.coordinates?.[0]
})

// Transform to match frontend shape
alertSchema.methods.toFrontendJSON = function () {
  const obj = this.toObject({ virtuals: true })
  // Convert GeoJSON coordinates to frontend-friendly { lat, lng }
  obj.coordinates = {
    lat: this.coordinates.coordinates[1],
    lng: this.coordinates.coordinates[0],
  }
  // Map _id to id for frontend compatibility
  obj.id = obj._id.toString()
  // Convert timeline dates to ISO strings
  if (obj.timeline) {
    obj.timeline = obj.timeline.map(t => ({
      ...t,
      time: t.time instanceof Date ? t.time.toISOString() : t.time,
    }))
  }
  // Convert timestamps
  obj.reportedAt = obj.createdAt?.toISOString?.() || obj.createdAt
  obj.updatedAt = obj.updatedAt?.toISOString?.() || obj.updatedAt
  delete obj.__v
  return obj
}

alertSchema.set('toJSON', { virtuals: true })

export default mongoose.model('Alert', alertSchema)

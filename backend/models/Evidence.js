import mongoose from 'mongoose'

const evidenceSchema = new mongoose.Schema({
  alertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    required: true,
    index: true,
  },
  sourceType: {
    type: String,
    enum: ['weather', 'sensor', 'iot', 'official', 'citizen', 'satellite', 'seismic', 'cctv'],
    required: true,
  },
  sourceName: {
    type: String,
    required: true,
  },
  // Raw data from the source
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // When the evidence was observed (not when it was ingested)
  observedAt: {
    type: Date,
    required: true,
  },
  // Whether this evidence has been verified by a human
  verified: {
    type: Boolean,
    default: false,
  },
  // Weight for confidence calculation (0.0 – 1.0)
  // Inherits from DataSource.reliabilityWeight but can be overridden
  weight: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  // Does this evidence corroborate or contradict the alert?
  corroborates: {
    type: Boolean,
    default: true,
  },
  // Freshness decay — how many hours before this evidence loses relevance
  relevanceHalfLifeHours: {
    type: Number,
    default: 24,
  },
}, {
  timestamps: true,
})

// Index for fetching all evidence for an alert efficiently
evidenceSchema.index({ alertId: 1, createdAt: -1 })

export default mongoose.model('Evidence', evidenceSchema)

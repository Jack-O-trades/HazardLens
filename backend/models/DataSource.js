import mongoose from 'mongoose'

const dataSourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['weather', 'sensor', 'iot', 'official', 'citizen', 'satellite', 'seismic'],
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  // Reliability weight for evidence fusion (0.0 – 1.0)
  reliabilityWeight: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  // Configuration for the adapter (API keys, endpoints, etc.)
  config: {
    endpoint: { type: String, default: null },
    apiKey: { type: String, default: null },
    pollIntervalMs: { type: Number, default: 300000 }, // 5 min default
    headers: { type: Map, of: String, default: {} },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'maintenance'],
    default: 'active',
  },
  lastFetchAt: {
    type: Date,
    default: null,
  },
  lastError: {
    type: String,
    default: null,
  },
  fetchCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
})

export default mongoose.model('DataSource', dataSourceSchema)

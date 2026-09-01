import mongoose from 'mongoose'

const reliefCampSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  },
  district: {
    type: String,
    default: '',
  },
  block: {
    type: String,
    default: '',
  },
  village: {
    type: String,
    default: '',
  },
  capacity: {
    type: Number,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  designated_by: {
    type: String,
    default: 'District Administrator',
  },
  source: {
    type: String,
    default: 'Manual Designation',
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
})

// GeoJSON 2dsphere index for spatial queries (nearby camps)
reliefCampSchema.index({ coordinates: '2dsphere' })

// Virtual: lat/lng accessors matching frontend expectations
reliefCampSchema.virtual('lat').get(function () {
  return this.coordinates?.coordinates?.[1]
})
reliefCampSchema.virtual('lng').get(function () {
  return this.coordinates?.coordinates?.[0]
})

// Transform to match frontend shape
reliefCampSchema.methods.toFrontendJSON = function () {
  const obj = this.toObject({ virtuals: true })
  obj.coordinates = {
    lat: this.coordinates.coordinates[1],
    lng: this.coordinates.coordinates[0],
  }
  obj.id = obj._id.toString()
  obj.designated_at = obj.createdAt?.toISOString?.() || obj.createdAt
  obj.updated_at = obj.updatedAt?.toISOString?.() || obj.updatedAt
  delete obj.__v
  return obj
}

reliefCampSchema.set('toJSON', { virtuals: true })

export default mongoose.model('ReliefCamp', reliefCampSchema)

import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['alert', 'status', 'system', 'correction', 'verification'],
    default: 'alert',
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    default: '',
  },
  read: {
    type: Boolean,
    default: false,
  },
  alertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    default: null,
  },
}, {
  timestamps: true,
})

// Index for efficient queries: unread notifications for a user
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

notificationSchema.methods.toFrontendJSON = function () {
  const obj = this.toObject()
  obj.id = obj._id.toString()
  obj.time = obj.createdAt?.toISOString?.() || obj.createdAt
  if (obj.alertId) obj.alertId = obj.alertId.toString()
  obj.userId = obj.userId.toString()
  delete obj.__v
  return obj
}

export default mongoose.model('Notification', notificationSchema)

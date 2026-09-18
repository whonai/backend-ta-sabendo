import mongoose from 'mongoose';

const MonitoredInstagramProfileSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true },
    username: { type: String, required: true, index: true },
    instagramUrl: String,
    venueId: { type: String, required: true, index: true },
    active: { type: Boolean, default: true, index: true },
    lastCheckedAt: String,
    lastSuccessfulCheckAt: String,
    lastError: String,
    lastErrorStage: String,
    lastErrorAt: String,
    createdAt: String,
    updatedAt: String,
  },
  { collection: 'monitored_instagram_profiles' }
);

MonitoredInstagramProfileSchema.index({ username: 1 }, { unique: true });

const MonitoredInstagramProfileModel = mongoose.model(
  'MonitoredInstagramProfile',
  MonitoredInstagramProfileSchema
);

export default MonitoredInstagramProfileModel;

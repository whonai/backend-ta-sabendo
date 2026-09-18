import mongoose from 'mongoose';

const ModerationFlagSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true },
  },
  { strict: false }
);

ModerationFlagSchema.add({
  targetId: String,
  targetType: String,
  targetTitle: String,
  reason: String,
  reasonLabel: String,
  reportedAt: String,
  createdAt: String,
  status: String,
  reportedBy: String,
  reportedByUserId: String,
  notes: String,
  details: String,
});

const ModerationFlagModel = mongoose.model('ModerationFlag', ModerationFlagSchema);
export default ModerationFlagModel;

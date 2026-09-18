import mongoose from 'mongoose';

export type ParticipationKind = 'confirm' | 'going' | 'interested' | 'check_in' | 'dispute';

const EventParticipationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    eventId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    kind: { type: String, required: true, enum: ['confirm', 'going', 'interested', 'check_in', 'dispute'] },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

EventParticipationSchema.index({ eventId: 1, userId: 1, kind: 1 }, { unique: true });

const EventParticipationModel = mongoose.model('EventParticipation', EventParticipationSchema);
export default EventParticipationModel;

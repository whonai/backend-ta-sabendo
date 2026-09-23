import mongoose from 'mongoose';

const CoordinatesSchema = new mongoose.Schema({ lat: Number, lng: Number }, { _id: false });
const CreatedBySchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    reputationLevel: String,
    trustworthinessScore: Number,
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true },
  },
  { strict: false, timestamps: false }
);

EventSchema.add({
  title: String,
  description: String,
  category: String,
  venueName: String,
  address: String,
  neighborhood: String,
  coordinates: CoordinatesSchema,
  date: { type: String, required: false },
  dayLabel: String,
  startTime: String,
  endTime: String,
  price: String,
  imageUrl: String,
  externalLink: String,
  interestedCount: Number,
  goingCount: Number,
  currentAttendees: Number,
  status: String,
  origin: String,
  venueId: String,
  confirmationsCount: Number,
  disputesCount: Number,
  evidenceCount: Number,
  reliabilityScore: Number,
  hasUserRsvpGoing: Boolean,
  hasUserRsvpInterested: Boolean,
  hasUserCheckedIn: Boolean,
  hasUserConfirmed: Boolean,
  createdBy: CreatedBySchema,
  createdAt: String,
  updatedAt: String,
  source: String,
  extractionConfidence: Number,
  extractedText: String,
  sourceInstagramUsername: String,
  sourceMediaId: String,
  detectedAt: String,
  artist: String,
  artists: [String],
  incompleteFields: [String],
  possibleDuplicateOf: String,
});

const EventModel = mongoose.model('Event', EventSchema);
export default EventModel;

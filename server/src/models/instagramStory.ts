import mongoose from 'mongoose';

const InstagramStorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true },
    instagramMediaId: { type: String, required: true, index: true, unique: true },
    contentHash: { type: String, index: true },
    username: { type: String, required: true, index: true },
    venueId: { type: String, required: true, index: true },
    mediaType: String,
    mediaUrl: String,
    localMediaPath: String,
    thumbnailUrl: String,
    timestamp: String,
    processingStatus: {
      type: String,
      enum: ['NEW', 'PROCESSING', 'PROCESSED', 'IGNORED', 'ERROR'],
      default: 'NEW',
      index: true,
    },
    processedAt: String,
    ocrText: String,
    linkedEventId: String,
    lastError: String,
    lastErrorStage: String,
    extractionConfidence: Number,
    createdAt: String,
    updatedAt: String,
  },
  { collection: 'instagram_stories' }
);

const InstagramStoryModel = mongoose.model('InstagramStory', InstagramStorySchema);
export default InstagramStoryModel;

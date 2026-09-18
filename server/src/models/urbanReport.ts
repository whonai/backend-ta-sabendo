import mongoose from 'mongoose';

const CoordinatesSchema = new mongoose.Schema({ lat: Number, lng: Number }, { _id: false });
const CreatedBySchema = new mongoose.Schema(
  { id: String, name: String, reputationLevel: String },
  { _id: false }
);

const UrbanReportSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true },
  },
  { strict: false }
);

UrbanReportSchema.add({
  type: String,
  title: String,
  description: String,
  streetName: String,
  neighborhood: String,
  coordinates: CoordinatesSchema,
  status: String,
  confirmationsCount: Number,
  disputesCount: Number,
  imageUrl: String,
  reliabilityScore: Number,
  hasUserConfirmed: Boolean,
  createdBy: CreatedBySchema,
  createdAt: String,
  lastConfirmedAt: String,
});

const UrbanReportModel = mongoose.model('UrbanReport', UrbanReportSchema);
export default UrbanReportModel;

import mongoose from 'mongoose';

const HistorySchema = new mongoose.Schema(
  {
    date: String,
    condition: String,
    evaluations: Number,
  },
  { _id: false }
);

const StreetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true },
  },
  { strict: false }
);

StreetSchema.add({
  streetName: String,
  neighborhood: String,
  condition: String,
  path: [[Number]],
  evaluationsCount: Number,
  confidenceScore: Number,
  lastUpdated: String,
  history: [HistorySchema],
  recentComments: [String],
});

const StreetModel = mongoose.model('Street', StreetSchema);
export default StreetModel;

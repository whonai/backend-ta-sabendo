import mongoose from 'mongoose';

const CoordinatesSchema = new mongoose.Schema({ lat: Number, lng: Number }, { _id: false });

const VenueSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true },
  },
  { strict: false }
);

VenueSchema.add({
  name: String,
  category: String,
  isVerified: Boolean,
  address: String,
  neighborhood: String,
  coordinates: CoordinatesSchema,
  photoUrl: String,
  description: String,
  openingHours: String,
  activeEventsCount: Number,
  claimedByOwner: Boolean,
});

const VenueModel = mongoose.model('Venue', VenueSchema);
export default VenueModel;

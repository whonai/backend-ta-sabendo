import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: String,
    avatarUrl: String,
    isAdmin: Boolean,
    role: String,
    reputationLevel: String,
    trustworthinessScore: Number,
  },
  { strict: false }
);

const UserModel = mongoose.model('User', UserSchema);
export default UserModel;

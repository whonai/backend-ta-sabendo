import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true, unique: true },
    email: { type: String, required: true, unique: true },
    /** Ausente para contas criadas somente via Google. */
    passwordHash: { type: String },
    googleId: { type: String, index: true, unique: true, sparse: true },
    name: String,
    avatarUrl: String,
    isAdmin: Boolean,
    role: String,
    reputationLevel: String,
    trustworthinessScore: Number,
  },
  { strict: false, timestamps: true }
);

const UserModel = mongoose.model('User', UserSchema);
export default UserModel;

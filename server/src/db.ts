import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EventModel from './models/event';
import UrbanReportModel from './models/urbanReport';
import StreetModel from './models/street';
import VenueModel from './models/venue';
import UserModel from './models/user';
import ModerationFlagModel from './models/moderationFlag';
import {
  buildSeedEvents,
  buildSeedUrbanReports,
  seedModerationFlags,
  seedStreets,
  seedVenues,
} from './seedData';
import { hashPassword } from './auth/token';
import { isLegacyEventDoc } from './mappers';
import { closeStaleNonCuratedPastEvents, syncCuratedCatalog } from './services/curatedCatalogSync';
import { realignAllEventEngagement } from './services/eventEngagement';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/ta_rolando';

async function needsReseed(): Promise<boolean> {
  const sample = await EventModel.findOne().lean();
  if (!sample) return true;
  return isLegacyEventDoc(sample as Record<string, unknown>);
}

async function reseedAll(): Promise<void> {
  const curatedVenueIds = seedVenues.map(v => v.id);
  await Promise.all([
    EventModel.deleteMany({}),
    UrbanReportModel.deleteMany({}),
    StreetModel.deleteMany({}),
    VenueModel.deleteMany({ id: { $in: curatedVenueIds } }),
    ModerationFlagModel.deleteMany({}),
  ]);
  await EventModel.insertMany(buildSeedEvents(new Date()));
  await UrbanReportModel.insertMany(buildSeedUrbanReports(new Date()));
  await StreetModel.insertMany(seedStreets);
  await VenueModel.insertMany(seedVenues.map(v => ({ ...v, source: 'curated' })));
  await ModerationFlagModel.insertMany(seedModerationFlags);
}

async function seedUsersIfEmpty(): Promise<void> {
  const count = await UserModel.countDocuments();
  if (count > 0) return;

  await UserModel.create({
    id: 'user_current',
    email: 'naiaragms2018@gmail.com',
    passwordHash: hashPassword('admin123'),
    name: 'Naiara Gomes',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    isAdmin: true,
    role: 'admin',
    reputationLevel: 'Muito Confiável',
    trustworthinessScore: 94,
  });

  await UserModel.create({
    id: 'usr_demo',
    email: 'demo@tarolando.app',
    passwordHash: hashPassword('demo123'),
    name: 'Usuário Demo',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    isAdmin: false,
    role: 'user',
    reputationLevel: 'Colaborador',
    trustworthinessScore: 75,
  });
}

export async function connectDb() {
  await mongoose.connect(MONGODB_URI, {
    dbName: process.env.MONGODB_DB || 'ta_rolando',
    serverSelectionTimeoutMS: 10_000,
  });

  if (process.env.SEED_FORCE === 'true') {
    await reseedAll();
  } else if (process.env.SEED_ON_EMPTY === 'true' && (await needsReseed())) {
    const empty = !(await EventModel.findOne().lean());
    if (empty) await reseedAll();
  }

  if (process.env.SYNC_CURATED_ON_BOOT === 'true') {
    await syncCuratedCatalog(new Date());
    await closeStaleNonCuratedPastEvents(new Date());
  } else {
    await realignAllEventEngagement();
  }

  await seedUsersIfEmpty();

  return mongoose.connection;
}

export default mongoose;

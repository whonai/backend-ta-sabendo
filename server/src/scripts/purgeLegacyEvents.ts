/**
 * Remove todos os eventos (seed/curado/comunidade) e participações.
 * Opcional: limpar stories IG já processados (reprocessar na próxima coleta).
 *
 * Uso: npm run purge:events
 * Requer MONGODB_URI (server/.env ou .env na raiz do repo).
 */
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import EventModel from '../models/event';
import EventParticipationModel from '../models/eventParticipation';
import InstagramStoryModel from '../models/instagramStory';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const CLEAR_INSTAGRAM_STORIES = process.env.PURGE_CLEAR_INSTAGRAM_STORIES === 'true';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI não definido');
  }

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'ta_rolando' });

  const [events, parts] = await Promise.all([
    EventModel.deleteMany({}),
    EventParticipationModel.deleteMany({}),
  ]);

  let storiesDeleted = 0;
  if (CLEAR_INSTAGRAM_STORIES) {
    const r = await InstagramStoryModel.deleteMany({});
    storiesDeleted = r.deletedCount ?? 0;
  }

  // eslint-disable-next-line no-console
  console.log('[purge] eventos removidos:', events.deletedCount ?? 0);
  // eslint-disable-next-line no-console
  console.log('[purge] participações removidas:', parts.deletedCount ?? 0);
  if (CLEAR_INSTAGRAM_STORIES) {
    // eslint-disable-next-line no-console
    console.log('[purge] instagram_stories removidos:', storiesDeleted);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

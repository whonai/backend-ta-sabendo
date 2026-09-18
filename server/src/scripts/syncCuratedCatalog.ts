import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { syncCuratedCatalog, closeStaleNonCuratedPastEvents } from '../services/curatedCatalogSync';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ta_rolando';

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || 'ta_rolando' });
  const now = new Date();
  await syncCuratedCatalog(now);
  const closed = await closeStaleNonCuratedPastEvents(now);
  // eslint-disable-next-line no-console
  console.log(`Catálogo curado sincronizado (${now.toISOString()}). Eventos comunitários encerrados por data: ${closed}`);
  await mongoose.disconnect();
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

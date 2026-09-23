/**
 * Importa bares, casas de show e locais similares do OpenStreetMap (grátis).
 * Uso: npm run import:osm-venues
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { defaultOsmBbox, importOsmVenues } from '../services/osm/osmVenueImportService';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ta_rolando';

async function main() {
  // eslint-disable-next-line no-console
  console.log('Conectando ao MongoDB…');
  await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || 'ta_rolando' });

  const result = await importOsmVenues(defaultOsmBbox());
  // eslint-disable-next-line no-console
  console.log('Import concluído:', result);
  // eslint-disable-next-line no-console
  console.log('Atribuição: © OpenStreetMap contributors (ODbL)');

  await mongoose.disconnect();
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

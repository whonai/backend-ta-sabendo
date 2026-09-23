/**
 * Cadastra (ou atualiza) um perfil Instagram monitorado ligado a um venueId.
 * Uso: npx ts-node --transpile-only src/scripts/registerMonitoredInstagramProfile.ts varandinha_fsa venue_varandinha
 */
import path from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { connectDb } from '../db';
import MonitoredInstagramProfileModel from '../models/monitoredInstagramProfile';
import VenueModel from '../models/venue';
import { seedVenues } from '../seedData';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function normalizeUsername(raw: string): string {
  return raw.replace(/^@/, '').trim().toLowerCase();
}

async function ensureVenue(venueId: string): Promise<void> {
  const existing = await VenueModel.findOne({ id: venueId }).lean();
  if (existing) return;

  const fromSeed = seedVenues.find(v => v.id === venueId);
  if (!fromSeed) {
    throw new Error(`Venue "${venueId}" não existe no banco e não está no seed.`);
  }
  await VenueModel.create({ ...fromSeed, source: 'curated' });
  // eslint-disable-next-line no-console
  console.log(`Venue criado a partir do seed: ${fromSeed.name} (${venueId})`);
}

async function main(): Promise<void> {
  const username = normalizeUsername(process.argv[2] || '');
  const venueId = String(process.argv[3] || '').trim();
  if (!username || !venueId) {
    // eslint-disable-next-line no-console
    console.error('Uso: registerMonitoredInstagramProfile.ts <username> <venueId>');
    process.exit(1);
  }

  await connectDb();
  await ensureVenue(venueId);

  const venue = await VenueModel.findOne({ id: venueId }).lean();
  const now = new Date().toISOString();
  const instagramUrl = `https://instagram.com/${username}`;

  const existing = await MonitoredInstagramProfileModel.findOne({ username }).lean();
  if (existing) {
    await MonitoredInstagramProfileModel.findOneAndUpdate(
      { username },
      {
        venueId,
        instagramUrl,
        active: true,
        updatedAt: now,
      }
    );
    // eslint-disable-next-line no-console
    console.log(`Perfil @${username} atualizado → venueId=${venueId}`);
  } else {
    await MonitoredInstagramProfileModel.create({
      id: uuidv4(),
      username,
      instagramUrl,
      venueId,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    // eslint-disable-next-line no-console
    console.log(`Perfil @${username} cadastrado → venueId=${venueId}`);
  }

  const coords = (venue as { coordinates?: { lat: number; lng: number }; name?: string })?.coordinates;
  const name = (venue as { name?: string })?.name;
  // eslint-disable-next-line no-console
  console.log(`Estabelecimento: ${name || venueId}`);
  // eslint-disable-next-line no-console
  console.log(`Coordenadas (do venue, usadas nos eventos do IG): ${coords ? `${coords.lat}, ${coords.lng}` : 'não definidas'}`);

  process.exit(0);
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

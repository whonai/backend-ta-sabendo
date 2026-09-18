/**
 * Importa bares, casas de show e locais similares do OpenStreetMap (grátis).
 * Uso: npm run import:osm-venues
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import VenueModel from '../models/venue';
import { seedVenues } from '../seedData';
import { buildOverpassQuery, osmElementToVenue, OsmElement } from '../osm/mapOsmToVenue';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ta_rolando';

/** Bbox aproximado: Feira de Santana + entorno */
const BBOX = {
  south: parseFloat(process.env.OSM_BBOX_SOUTH || '-12.32'),
  west: parseFloat(process.env.OSM_BBOX_WEST || '-39.02'),
  north: parseFloat(process.env.OSM_BBOX_NORTH || '-12.19'),
  east: parseFloat(process.env.OSM_BBOX_EAST || '-38.90'),
};

const OVERPASS_URL =
  process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

async function fetchOverpass(query: string): Promise<OsmElement[]> {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Overpass HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { elements?: OsmElement[] };
  return json.elements || [];
}

async function ensureCuratedVenues(): Promise<void> {
  for (const v of seedVenues) {
    await VenueModel.findOneAndUpdate(
      { id: v.id },
      { ...v, source: 'curated' },
      { upsert: true }
    );
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Conectando ao MongoDB…');
  await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || 'ta_rolando' });

  await ensureCuratedVenues();

  const query = buildOverpassQuery(BBOX.south, BBOX.west, BBOX.north, BBOX.east);
  // eslint-disable-next-line no-console
  console.log('Consultando OpenStreetMap (Overpass)…', BBOX);

  const elements = await fetchOverpass(query);
  // eslint-disable-next-line no-console
  console.log(`Elementos OSM recebidos: ${elements.length}`);

  let upserted = 0;
  let skipped = 0;

  for (const el of elements) {
    const venue = osmElementToVenue(el);
    if (!venue) {
      skipped += 1;
      continue;
    }
    await VenueModel.findOneAndUpdate(
      { id: venue.id },
      { ...venue, source: 'osm', osmType: el.type, osmId: el.id },
      { upsert: true }
    );
    upserted += 1;
  }

  const total = await VenueModel.countDocuments();
  // eslint-disable-next-line no-console
  console.log(`Import concluído: ${upserted} locais OSM upsert, ${skipped} ignorados (sem nome/coords). Total venues: ${total}`);
  // eslint-disable-next-line no-console
  console.log('Atribuição: © OpenStreetMap contributors (ODbL)');

  await mongoose.disconnect();
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

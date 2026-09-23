import VenueModel from '../../models/venue';
import { seedVenues } from '../../seedData';
import {
  buildOverpassQuery,
  instagramUsernameFromOsmTags,
  osmElementToVenue,
  OsmElement,
} from '../../osm/mapOsmToVenue';

export type OsmBbox = { south: number; west: number; north: number; east: number };

export function defaultOsmBbox(): OsmBbox {
  return {
    south: parseFloat(process.env.OSM_BBOX_SOUTH || '-12.32'),
    west: parseFloat(process.env.OSM_BBOX_WEST || '-39.02'),
    north: parseFloat(process.env.OSM_BBOX_NORTH || '-12.19'),
    east: parseFloat(process.env.OSM_BBOX_EAST || '-38.90'),
  };
}

const OVERPASS_URL = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

export async function fetchOverpassElements(query: string): Promise<OsmElement[]> {
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

export async function ensureCuratedVenues(): Promise<void> {
  for (const v of seedVenues) {
    await VenueModel.findOneAndUpdate({ id: v.id }, { ...v, source: 'curated' }, { upsert: true });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export type OsmImportResult = {
  bbox: OsmBbox;
  elementsReceived: number;
  upserted: number;
  skipped: number;
  withInstagram: number;
  totalVenues: number;
};

/** Importa locais do OSM em lotes (pausa curta entre lotes no Mongo). */
export async function importOsmVenues(
  bbox: OsmBbox = defaultOsmBbox(),
  batchSize = 40
): Promise<OsmImportResult> {
  await ensureCuratedVenues();

  const query = buildOverpassQuery(bbox.south, bbox.west, bbox.north, bbox.east);
  const elements = await fetchOverpassElements(query);

  let upserted = 0;
  let skipped = 0;
  let withInstagram = 0;

  for (let i = 0; i < elements.length; i += batchSize) {
    const chunk = elements.slice(i, i + batchSize);
    for (const el of chunk) {
      const venue = osmElementToVenue(el);
      if (!venue) {
        skipped += 1;
        continue;
      }
      const ig = instagramUsernameFromOsmTags(el.tags || {});
      const doc: Record<string, unknown> = {
        ...venue,
        source: 'osm',
        osmType: el.type,
        osmId: el.id,
      };
      if (ig) {
        doc.instagramUsername = ig;
        doc.instagramSource = 'osm';
        withInstagram += 1;
      }
      await VenueModel.findOneAndUpdate({ id: venue.id }, doc, { upsert: true });
      upserted += 1;
    }
    if (i + batchSize < elements.length) {
      await sleep(80);
    }
  }

  const totalVenues = await VenueModel.countDocuments();
  return {
    bbox,
    elementsReceived: elements.length,
    upserted,
    skipped,
    withInstagram,
    totalVenues,
  };
}

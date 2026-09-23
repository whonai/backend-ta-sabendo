import { Venue } from '../types';

const DEFAULT_PHOTO =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80';

type OsmTags = Record<string, string>;

export type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
};

const AMENITY_LABELS: Record<string, string> = {
  bar: 'Bar',
  pub: 'Pub',
  biergarten: 'Choperia',
  nightclub: 'Balada / Casa noturna',
  restaurant: 'Restaurante',
  cafe: 'Café',
  fast_food: 'Fast food',
  food_court: 'Praça de alimentação',
  theatre: 'Teatro',
  cinema: 'Cinema',
  arts_centre: 'Centro cultural',
  community_centre: 'Centro comunitário',
  events_venue: 'Casa de eventos',
  music_venue: 'Casa de shows',
  nightclub_lounge: 'Lounge',
};

function pickCategory(tags: OsmTags): string {
  const amenity = tags.amenity || '';
  if (AMENITY_LABELS[amenity]) return AMENITY_LABELS[amenity];
  if (tags.leisure === 'nightclub') return 'Balada';
  if (tags.tourism === 'museum') return 'Museu';
  if (tags.building === 'yes' && tags.name) return 'Estabelecimento';
  return 'Bar & Gastronomia';
}

function pickAddress(tags: OsmTags): string {
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:place'],
  ].filter(Boolean);
  if (parts.length) return parts.join(', ');
  if (tags.address) return tags.address;
  return 'Endereço não informado (OpenStreetMap)';
}

/** @username normalizado a partir de tags OSM (se existir). */
export function instagramUsernameFromOsmTags(tags: OsmTags): string | null {
  const raw =
    tags['contact:instagram'] ||
    tags['social:instagram'] ||
    tags.instagram ||
    tags['contact:social:instagram'] ||
    '';
  if (!raw.trim()) return null;
  let s = raw.trim();
  if (s.includes('instagram.com')) {
    const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
    if (m) s = m[1];
  }
  s = s.replace(/^@/, '').split(/[/?#]/)[0].trim();
  if (!/^[A-Za-z0-9._]{2,30}$/.test(s)) return null;
  return s.toLowerCase();
}

function pickNeighborhood(tags: OsmTags): string {
  return (
    tags['addr:suburb'] ||
    tags['addr:neighbourhood'] ||
    tags['addr:quarter'] ||
    tags['addr:district'] ||
    'Feira de Santana'
  );
}

export function osmElementToVenue(el: OsmElement): Venue | null {
  const tags = el.tags || {};
  const name = tags.name || tags['name:pt'] || tags.brand;
  if (!name) return null;

  let lat = el.lat;
  let lng = el.lon;
  if ((lat == null || lng == null) && el.center) {
    lat = el.center.lat;
    lng = el.center.lon;
  }
  if (lat == null || lng == null) return null;

  const id = `osm-${el.type}-${el.id}`;
  const openingHours = tags.opening_hours || 'Horário não informado no mapa';

  const descriptionParts = [
    tags.description,
    tags['description:pt'],
    tags.cuisine ? `Cozinha: ${tags.cuisine}` : '',
    tags.phone ? `Tel: ${tags.phone}` : '',
    tags.website ? tags.website : '',
  ].filter(Boolean);

  return {
    id,
    name,
    category: pickCategory(tags),
    isVerified: false,
    address: pickAddress(tags),
    neighborhood: pickNeighborhood(tags),
    coordinates: { lat, lng },
    photoUrl: DEFAULT_PHOTO,
    description:
      descriptionParts.join(' · ') ||
      'Local cadastrado via OpenStreetMap. Confirme horários antes de ir.',
    openingHours,
    activeEventsCount: 0,
    claimedByOwner: false,
  };
}

export function buildOverpassQuery(south: number, west: number, north: number, east: number): string {
  /** Sem fast_food / cafe / food_court — fila IG prioriza bar e evento. */
  const amenityFilter =
    'bar|pub|biergarten|nightclub|restaurant|theatre|cinema|arts_centre|community_centre|events_venue|music_venue';
  return `
[out:json][timeout:180];
(
  node["amenity"~"^(${amenityFilter})$"](${south},${west},${north},${east});
  way["amenity"~"^(${amenityFilter})$"](${south},${west},${north},${east});
  node["leisure"="nightclub"](${south},${west},${north},${east});
  way["leisure"="nightclub"](${south},${west},${north},${east});
);
out center tags;
`.trim();
}

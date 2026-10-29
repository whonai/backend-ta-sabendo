import { OsmElement } from './mapOsmToVenue';

type OsmTags = Record<string, string>;

/** Amenidades que entram direto (foco em bar / evento / cultura). */
const PRIORITY_AMENITIES = new Set([
  'bar',
  'pub',
  'biergarten',
  'nightclub',
  'music_venue',
  'events_venue',
  'theatre',
  'cinema',
  'arts_centre',
  'community_centre',
]);

/** Nunca importar / não exibir na fila de descoberta IG. */
const SKIP_AMENITIES = new Set([
  'fast_food',
  'food_court',
  'cafe',
  'bakery',
  'ice_cream',
  'meal_takeaway',
  'confectionery',
]);

const CHAIN_BRAND_RE =
  /\b(subway|mcdonald|mcdonalds|burger\s*king|kfc|pizza\s*hut|domino|dominos|habib|giraffas|bob'?s|china\s*in\s*box|outback|spoleto|sukiya|starbucks|dunkin|bobs|bk\b)\b/i;

const EAT_ONLY_NAME_RE =
  /\b(doceria|padaria|confeitaria|cuscuzeria|cuscuz|sorveteria|açaiteria|acaiteria|lanchonete|pastelaria|cafeteria|subway|hamburguer|hambúrguer|hot\s*dog|salgaderia|tapiocaria|esfiha|pizzaria)\b/i;

const NIGHT_VENUE_NAME_RE =
  /\b(bar|pub|lounge|boteco|choperia|balada|night|show|arena|club|festa|beer|cervej|boate|forr[oó]|samba|pagode)\b/i;

function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function tagsOf(el: OsmElement): OsmTags {
  return el.tags || {};
}

function combinedLabel(tags: OsmTags, name?: string): string {
  return normalizeText([name, tags.name, tags.brand, tags['name:pt']].filter(Boolean).join(' '));
}

export function isBlockedEatOnlyChain(tags: OsmTags, name?: string): boolean {
  const label = combinedLabel(tags, name);
  if (CHAIN_BRAND_RE.test(label)) return true;
  if (EAT_ONLY_NAME_RE.test(label)) return true;
  const brand = normalizeText(tags.brand || '');
  if (brand && CHAIN_BRAND_RE.test(brand)) return true;
  return false;
}

function restaurantLooksLikeNightVenue(tags: OsmTags, name?: string): boolean {
  if (tags.bar === 'yes' || tags.nightclub === 'yes') return true;
  const label = combinedLabel(tags, name);
  return NIGHT_VENUE_NAME_RE.test(label);
}

/** Decide se um elemento OSM deve ser importado e aparecer na fila IG. */
export function isOsmDiscoveryPriority(el: OsmElement): boolean {
  const tags = tagsOf(el);
  const name = tags.name || tags['name:pt'] || tags.brand;
  if (!name) return false;
  if (isBlockedEatOnlyChain(tags, name)) return false;

  if (tags.leisure === 'nightclub') return true;

  const amenity = tags.amenity || '';
  if (SKIP_AMENITIES.has(amenity)) return false;
  if (PRIORITY_AMENITIES.has(amenity)) return true;
  if (amenity === 'restaurant') return restaurantLooksLikeNightVenue(tags, name);

  return false;
}

/** Filtro para documentos já gravados no Mongo (reimport ou listagem). */
export function isStoredVenueDiscoveryPriority(raw: Record<string, unknown>): boolean {
  const name = String(raw.name || '');
  const tags: OsmTags = {
    brand: String(raw.osmBrand || ''),
    amenity: String(raw.osmAmenity || ''),
  };
  if (isBlockedEatOnlyChain(tags, name)) return false;

  const amenity = String(raw.osmAmenity || '').toLowerCase();
  if (amenity && SKIP_AMENITIES.has(amenity)) return false;
  if (amenity && PRIORITY_AMENITIES.has(amenity)) return true;
  if (amenity === 'restaurant') {
    const barTag: OsmTags = { ...tags };
    if (raw.osmBar === true) barTag.bar = 'yes';
    return restaurantLooksLikeNightVenue(barTag, name);
  }

  // Legado: sem osmAmenity — usa categoria + nome
  const category = normalizeText(String(raw.category || ''));
  if (
    category.includes('fast food') ||
    category === 'cafe' ||
    category.includes('café') ||
    category.includes('praça de alimentação') ||
    category.includes('sorveteria') ||
    category.includes('doceria') ||
    category.includes('padaria')
  ) {
    return false;
  }
  if (
    category.includes('bar') ||
    category.includes('pub') ||
    category.includes('balada') ||
    category.includes('show') ||
    category.includes('evento') ||
    category.includes('teatro') ||
    category.includes('cinema') ||
    category.includes('cultural')
  ) {
    return true;
  }
  if (category.includes('restaurante')) {
    return NIGHT_VENUE_NAME_RE.test(normalizeText(name));
  }

  // Curated / admin manual: mantém na fila
  if (raw.source === 'curated' || raw.source === 'admin') return true;

  return NIGHT_VENUE_NAME_RE.test(normalizeText(name));
}

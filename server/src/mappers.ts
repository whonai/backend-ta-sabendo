import {
  AdminPendingEvent,
  AdminPendingEventListItem,
  AppEvent,
  EventCategory,
  EventOrigin,
  EventStatus,
  ReputationLevel,
  StreetSegment,
  UrbanIssueType,
  UrbanReport,
  Venue,
} from './types';
import {
  ensureEventScheduleFields,
  formatYmdInBahia,
  isValidYmd,
  parseIsoToBahiaSchedule,
} from './utils/eventSchedule';

function coerceEventDateYmd(raw: unknown, fallback: string): string {
  if (isValidYmd(raw)) return raw;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return formatYmdInBahia(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    if (isValidYmd(raw.trim())) return raw.trim();
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return formatYmdInBahia(parsed);
  }
  return fallback;
}

const EVENT_CATEGORIES = new Set<string>([
  'shows', 'teatro', 'festas', 'bares', 'dj', 'futebol', 'feiras', 'cultural',
  'universitario', 'gratuito', 'gastronomico', 'espontaneo',
]);

const LEGACY_EVENT_CATEGORY: Record<string, EventCategory> = {
  forro: 'cultural',
  pagode: 'shows',
  sertanejo: 'shows',
  rock: 'shows',
  mpb: 'shows',
  eletronica: 'dj',
  gastronomia: 'gastronomico',
  outro: 'espontaneo',
};

const EVENT_STATUSES = new Set<string>([
  'unconfirmed', 'confirmed', 'high_confidence', 'disputed', 'closed',
  'pending', 'published', 'rejected',
]);

const LEGACY_EVENT_STATUS: Record<string, EventStatus> = {
  active: 'confirmed',
  ending_soon: 'confirmed',
  ended: 'closed',
};

const LEGACY_ORIGIN: Record<string, EventOrigin> = {
  scraped: 'platform',
};

const URBAN_TYPES = new Set<string>([
  'pothole', 'lighting', 'flooding', 'trash', 'traffic_light', 'sidewalk',
  'traffic', 'construction', 'other',
]);

const LEGACY_URBAN_TYPE: Record<string, UrbanIssueType> = {
  flood: 'flooding',
  traffic_jam: 'traffic',
  accident: 'traffic',
  police_blitz: 'traffic',
  hazard: 'other',
  tree_down: 'other',
};

const DEFAULT_CREATOR = {
  id: 'usr_community',
  name: 'Comunidade Tá Rolando',
  reputationLevel: 'Colaborador' as ReputationLevel,
  trustworthinessScore: 85,
};

export function isLegacyEventDoc(raw: Record<string, unknown>): boolean {
  if (raw.startsAt || raw.endsAt) return true;
  const cat = raw.category as string;
  if (cat && !EVENT_CATEGORIES.has(cat)) return true;
  const st = raw.status as string;
  if (st && !EVENT_STATUSES.has(st)) return true;
  return false;
}

export function toAppEvent(raw: Record<string, unknown>): AppEvent {
  const id = String(raw.id || '');
  const startsAt = raw.startsAt as string | undefined;
  const endsAt = raw.endsAt as string | undefined;
  const fromStart = parseIsoToBahiaSchedule(startsAt);
  const fromEnd = endsAt ? parseIsoToBahiaSchedule(endsAt).startTime : undefined;

  let category = (raw.category as EventCategory) || 'espontaneo';
  if (!EVENT_CATEGORIES.has(category)) {
    category = LEGACY_EVENT_CATEGORY[category] || 'espontaneo';
  }

  let status = (raw.status as EventStatus) || 'unconfirmed';
  if (!EVENT_STATUSES.has(status)) {
    status = LEGACY_EVENT_STATUS[status] || 'unconfirmed';
  }

  let origin = (raw.origin as EventOrigin) || 'user';
  if ((raw.origin as string) === 'scraped') origin = LEGACY_ORIGIN.scraped;

  const createdByRaw = raw.createdBy as AppEvent['createdBy'] | undefined;
  const createdBy = createdByRaw?.id
    ? createdByRaw
    : DEFAULT_CREATOR;

  const coords = raw.coordinates as { lat: number; lng: number } | undefined;

  const dateFallback = fromStart.date;
  const schedule = ensureEventScheduleFields({
    date: coerceEventDateYmd(raw.date, dateFallback),
    dayLabel: raw.dayLabel as string | undefined,
    startTime: (raw.startTime as string | undefined) || fromStart.startTime,
    endTime: (raw.endTime as string | undefined) || fromEnd,
  });

  return {
    id,
    title: String(raw.title || 'Sem título'),
    description: String(raw.description || ''),
    category,
    venueName: String(raw.venueName || ''),
    address: String(raw.address || ''),
    neighborhood: String(raw.neighborhood || 'Centro'),
    coordinates: coords?.lat != null ? { lat: coords.lat, lng: coords.lng ?? 0 } : { lat: -12.2575, lng: -38.9668 },
    date: schedule.date,
    dayLabel: schedule.dayLabel,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    price: String(raw.price ?? 'Gratuito'),
    imageUrl: String(
      raw.imageUrl ||
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
    ),
    externalLink: raw.externalLink as string | undefined,
    interestedCount: Number(raw.interestedCount ?? 0),
    goingCount: Number(raw.goingCount ?? 0),
    currentAttendees: Number(raw.currentAttendees ?? 0),
    status,
    origin,
    venueId: raw.venueId as string | undefined,
    confirmationsCount: Number(raw.confirmationsCount ?? 0),
    disputesCount: Number(raw.disputesCount ?? 0),
    evidenceCount: Number(raw.evidenceCount ?? 0),
    reliabilityScore: Number(raw.reliabilityScore ?? 70),
    hasUserRsvpGoing: raw.hasUserRsvpGoing as boolean | undefined,
    hasUserRsvpInterested: raw.hasUserRsvpInterested as boolean | undefined,
    hasUserCheckedIn: raw.hasUserCheckedIn as boolean | undefined,
    hasUserConfirmed: raw.hasUserConfirmed as boolean | undefined,
    createdBy,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
}

export function toAdminPendingEventListItem(
  raw: Record<string, unknown>
): AdminPendingEventListItem {
  const coords = raw.coordinates as { lat: number; lng: number } | undefined;
  const schedule = ensureEventScheduleFields({
    date: coerceEventDateYmd(raw.date, formatYmdInBahia()),
    dayLabel: raw.dayLabel as string | undefined,
    startTime: (raw.startTime as string | undefined) || '',
    endTime: raw.endTime as string | undefined,
  });

  let category = (raw.category as AdminPendingEventListItem['category']) || 'espontaneo';
  if (!EVENT_CATEGORIES.has(category)) {
    category = LEGACY_EVENT_CATEGORY[category] || 'espontaneo';
  }

  const imageUrl = String(raw.imageUrl || '').trim();

  return {
    id: String(raw.id || ''),
    status: 'pending',
    title: String(raw.title || 'Sem título'),
    description: String(raw.description || ''),
    category,
    venueId: raw.venueId as string | undefined,
    venueName: String(raw.venueName || ''),
    address: String(raw.address || ''),
    neighborhood: String(raw.neighborhood || 'Centro'),
    coordinates: coords?.lat != null
      ? { lat: coords.lat, lng: coords.lng ?? 0 }
      : { lat: -12.2575, lng: -38.9668 },
    date: schedule.date,
    dayLabel: schedule.dayLabel,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    price: String(raw.price ?? ''),
    imageUrl,
    externalLink: raw.externalLink as string | undefined,
    artist: (raw.artist as string | undefined) || undefined,
    artists: raw.artists as string[] | undefined,
    source: raw.source as 'instagram' | undefined,
    sourceInstagramUsername: raw.sourceInstagramUsername as string | undefined,
    extractionConfidence: raw.extractionConfidence as number | undefined,
    incompleteFields: raw.incompleteFields as string[] | undefined,
    possibleDuplicateOf: raw.possibleDuplicateOf as string | undefined,
    detectedAt: raw.detectedAt as string | undefined,
  };
}

export function toAdminPendingEvent(raw: Record<string, unknown>): AdminPendingEvent {
  const base = toAppEvent(raw);
  return {
    ...base,
    source: raw.source as AdminPendingEvent['source'],
    extractionConfidence: raw.extractionConfidence as number | undefined,
    extractedText: raw.extractedText as string | undefined,
    sourceInstagramUsername: raw.sourceInstagramUsername as string | undefined,
    sourceMediaId: raw.sourceMediaId as string | undefined,
    detectedAt: raw.detectedAt as string | undefined,
    artist: (raw.artist as string | null | undefined) ?? undefined,
    artists: raw.artists as string[] | undefined,
    incompleteFields: raw.incompleteFields as string[] | undefined,
    possibleDuplicateOf: raw.possibleDuplicateOf as string | undefined,
  };
}

export function isLegacyUrbanDoc(raw: Record<string, unknown>): boolean {
  if (raw.type && URBAN_TYPES.has(String(raw.type))) return false;
  return Boolean(raw.category);
}

export function toUrbanReport(raw: Record<string, unknown>): UrbanReport {
  let type = raw.type as UrbanIssueType | undefined;
  if (!type || !URBAN_TYPES.has(type)) {
    const legacy = raw.category as string;
    type = LEGACY_URBAN_TYPE[legacy] || 'other';
  }

  const createdByRaw = raw.createdBy as UrbanReport['createdBy'] | undefined;
  const createdBy = createdByRaw?.id
    ? createdByRaw
    : {
        id: 'usr_community',
        name: 'Comunidade',
        reputationLevel: 'Colaborador' as ReputationLevel,
      };

  let status = (raw.status as EventStatus) || 'confirmed';
  if (!EVENT_STATUSES.has(status)) status = 'confirmed';

  const coords = raw.coordinates as { lat: number; lng: number } | undefined;
  const createdAt = String(raw.createdAt || new Date().toISOString());

  return {
    id: String(raw.id || ''),
    type,
    title: String(raw.title || raw.description || 'Relato urbano'),
    description: raw.description as string | undefined,
    streetName: String(raw.streetName || ''),
    neighborhood: String(raw.neighborhood || 'Centro'),
    coordinates: coords?.lat != null ? { lat: coords.lat, lng: coords.lng ?? 0 } : { lat: -12.2575, lng: -38.9668 },
    status,
    confirmationsCount: Number(raw.confirmationsCount ?? 0),
    disputesCount: Number(raw.disputesCount ?? raw.denialsCount ?? 0),
    imageUrl: raw.imageUrl as string | undefined,
    reliabilityScore: Number(raw.reliabilityScore ?? 60),
    hasUserConfirmed: raw.hasUserConfirmed as boolean | undefined,
    createdBy,
    createdAt,
    lastConfirmedAt: String(raw.lastConfirmedAt || createdAt),
  };
}

export function toStreetSegment(raw: Record<string, unknown>): StreetSegment {
  const pathFromLegacy = Array.isArray(raw.coordinates)
    ? (raw.coordinates as { lat: number; lng: number }[]).map(
        (c): [number, number] => [c.lat, c.lng]
      )
    : undefined;

  return {
    id: String(raw.id || ''),
    streetName: String(raw.streetName || raw.name || ''),
    neighborhood: String(raw.neighborhood || ''),
    condition: (raw.condition as StreetSegment['condition']) || 'insufficient_data',
    path: (raw.path as [number, number][] | undefined) || pathFromLegacy || [],
    evaluationsCount: Number(raw.evaluationsCount ?? 0),
    confidenceScore: Number(raw.confidenceScore ?? 50),
    lastUpdated: String(raw.lastUpdated || 'Há pouco'),
    history: (raw.history as StreetSegment['history']) || [],
    recentComments: raw.recentComments as string[] | undefined,
  };
}

export function toVenue(raw: Record<string, unknown>, activeEventsCount = 0): Venue & { source?: string } {
  const coords = raw.coordinates as { lat: number; lng: number };
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    category: String(raw.category || ''),
    isVerified: Boolean(raw.isVerified),
    address: String(raw.address || ''),
    neighborhood: String(raw.neighborhood || ''),
    coordinates: { lat: coords.lat, lng: coords.lng },
    photoUrl: String(raw.photoUrl || ''),
    description: String(raw.description || ''),
    openingHours: String(raw.openingHours || ''),
    activeEventsCount,
    claimedByOwner: raw.claimedByOwner as boolean | undefined,
    source: raw.source as 'osm' | 'curated' | undefined,
  };
}

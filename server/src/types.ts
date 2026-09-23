/** Alinhado a ta-sabendo/src/types/index.ts */

export type Coordinates = { lat: number; lng: number; accuracy?: number };

export type EventCategory =
  | 'shows'
  | 'teatro'
  | 'festas'
  | 'bares'
  | 'dj'
  | 'futebol'
  | 'feiras'
  | 'cultural'
  | 'universitario'
  | 'gratuito'
  | 'gastronomico'
  | 'espontaneo';

export type EventStatus =
  | 'unconfirmed'
  | 'confirmed'
  | 'high_confidence'
  | 'disputed'
  | 'closed'
  | 'pending'
  | 'published'
  | 'rejected';

export type EventOrigin = 'platform' | 'user' | 'verified_venue';

export type ReputationLevel =
  | 'Novo'
  | 'Colaborador'
  | 'Confiável'
  | 'Muito Confiável';

export type AppEvent = {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  venueName: string;
  address: string;
  neighborhood: string;
  coordinates: Coordinates;
  date: string;
  dayLabel?: string;
  startTime: string;
  endTime?: string;
  price: string;
  imageUrl: string;
  externalLink?: string;
  interestedCount: number;
  goingCount: number;
  currentAttendees: number;
  status: EventStatus;
  origin: EventOrigin;
  venueId?: string;
  confirmationsCount: number;
  disputesCount: number;
  evidenceCount: number;
  reliabilityScore: number;
  hasUserRsvpGoing?: boolean;
  hasUserRsvpInterested?: boolean;
  hasUserCheckedIn?: boolean;
  hasUserConfirmed?: boolean;
  createdBy: {
    id: string;
    name: string;
    reputationLevel: ReputationLevel;
    trustworthinessScore: number;
  };
  createdAt: string;
  updatedAt: string;
};

/** Campos extras para revisão admin (pipeline Instagram). */
export type AdminInstagramEventFields = {
  source?: 'instagram';
  extractionConfidence?: number;
  extractedText?: string;
  sourceInstagramUsername?: string;
  sourceMediaId?: string;
  detectedAt?: string;
  artist?: string | null;
  artists?: string[];
  incompleteFields?: string[];
  possibleDuplicateOf?: string;
};

export type AdminPendingEvent = AppEvent & AdminInstagramEventFields;

/** Resposta enxuta de GET /admin/events/pending */
export type AdminPendingEventListItem = {
  id: string;
  status: 'pending';
  title: string;
  description: string;
  category: EventCategory;
  venueId?: string;
  venueName: string;
  address: string;
  neighborhood: string;
  coordinates: Coordinates;
  date: string;
  dayLabel?: string;
  startTime: string;
  endTime?: string;
  price: string;
  imageUrl: string;
  externalLink?: string;
  artist?: string;
  artists?: string[];
  source?: 'instagram';
  sourceInstagramUsername?: string;
  extractionConfidence?: number;
  incompleteFields?: string[];
  possibleDuplicateOf?: string;
  detectedAt?: string;
};

export type MonitoredInstagramProfile = {
  id: string;
  username: string;
  instagramUrl?: string;
  venueId: string;
  active: boolean;
  lastCheckedAt?: string;
  lastSuccessfulCheckAt?: string;
  lastError?: string;
  lastErrorStage?: string;
  lastErrorAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type UrbanIssueType =
  | 'pothole'
  | 'lighting'
  | 'flooding'
  | 'trash'
  | 'traffic_light'
  | 'sidewalk'
  | 'traffic'
  | 'traffic_enforcement'
  | 'construction'
  | 'other';

export type UrbanReport = {
  id: string;
  type: UrbanIssueType;
  title: string;
  description?: string;
  streetName: string;
  neighborhood: string;
  coordinates: Coordinates;
  status: EventStatus;
  confirmationsCount: number;
  disputesCount: number;
  imageUrl?: string;
  reliabilityScore: number;
  hasUserConfirmed?: boolean;
  createdBy: {
    id: string;
    name: string;
    reputationLevel: ReputationLevel;
  };
  createdAt: string;
  lastConfirmedAt: string;
};

export type StreetCondition =
  | 'good'
  | 'attention'
  | 'bad'
  | 'insufficient_data';

export type StreetConditionHistory = {
  date: string;
  condition: 'good' | 'attention' | 'bad';
  evaluations: number;
};

export type StreetSegment = {
  id: string;
  streetName: string;
  neighborhood: string;
  condition: StreetCondition;
  path: [number, number][];
  evaluationsCount: number;
  confidenceScore: number;
  lastUpdated: string;
  history: StreetConditionHistory[];
  recentComments?: string[];
};

export type Venue = {
  id: string;
  name: string;
  category: string;
  isVerified: boolean;
  address: string;
  neighborhood: string;
  coordinates: Coordinates;
  photoUrl: string;
  description: string;
  openingHours: string;
  activeEventsCount: number;
  claimedByOwner?: boolean;
};

export type CityPulse = {
  activeEventsCount: number;
  bustlingZonesCount: number;
  confirmedFloodsCount: number;
  cityMood: string;
  hotspots: {
    name: string;
    neighborhood: string;
    type: string;
    attendees: number;
    activityScore: number;
    trend: 'up' | 'stable' | 'down';
  }[];
  criticalUrbanAlerts: {
    id: string;
    type: UrbanIssueType;
    location: string;
    timeAgo: string;
    confirmations: number;
  }[];
};

export type ReportReason =
  | 'false_info'
  | 'fake_news'
  | 'spam'
  | 'non_existent'
  | 'already_ended'
  | 'inappropriate'
  | 'offensive'
  | 'wrong_location'
  | 'fraud'
  | 'other';

export type ModerationFlag = {
  id: string;
  targetId: string;
  targetType: 'event' | 'urban_report';
  targetTitle?: string;
  reason: ReportReason;
  reasonLabel?: string;
  reportedAt?: string;
  createdAt?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  reportedBy?: string;
  reportedByUserId?: string;
  notes?: string;
  details?: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  role?: 'admin' | 'user';
  reputationLevel?: ReputationLevel;
  trustworthinessScore?: number;
};

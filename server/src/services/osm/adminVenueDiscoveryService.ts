import VenueModel from '../../models/venue';
import MonitoredInstagramProfileModel from '../../models/monitoredInstagramProfile';
import { toVenue } from '../../mappers';
import { isStoredVenueDiscoveryPriority } from '../../osm/osmVenuePriority';

export type AdminVenueInstagramQueueItem = {
  id: string;
  name: string;
  category: string;
  neighborhood: string;
  address: string;
  source?: string;
  instagramUsername?: string;
  monitoredUsername?: string;
  monitoredProfileId?: string;
  instagramDiscoverOutcome?: string;
  instagramDiscoverMessage?: string;
  instagramDiscoverSearchedAt?: string;
};

function toQueueItem(
  raw: Record<string, unknown>,
  monitored?: { id: string; username: string }
): AdminVenueInstagramQueueItem {
  const base = toVenue(raw, Number(raw.activeEventsCount) || 0);
  return {
    id: base.id,
    name: base.name,
    category: base.category,
    neighborhood: base.neighborhood,
    address: base.address,
    source: raw.source as string | undefined,
    instagramUsername: raw.instagramUsername as string | undefined,
    monitoredUsername: monitored?.username,
    monitoredProfileId: monitored?.id,
    instagramDiscoverOutcome: raw.instagramDiscoverOutcome as string | undefined,
    instagramDiscoverMessage: raw.instagramDiscoverMessage as string | undefined,
    instagramDiscoverSearchedAt: raw.instagramDiscoverSearchedAt as string | undefined,
  };
}

export async function getAdminVenueInstagramQueues(): Promise<{
  pending: AdminVenueInstagramQueueItem[];
  noMatch: AdminVenueInstagramQueueItem[];
  withSuggestions: AdminVenueInstagramQueueItem[];
  monitored: AdminVenueInstagramQueueItem[];
  counts: {
    pending: number;
    noMatch: number;
    withSuggestions: number;
    monitored: number;
    totalOsmInDb: number;
    hiddenNotPriority: number;
  };
}> {
  const [venueDocs, profiles] = await Promise.all([
    VenueModel.find({ source: 'osm' }).lean(),
    MonitoredInstagramProfileModel.find().lean(),
  ]);

  const profileByVenueId = new Map<string, { id: string; username: string }>();
  for (const p of profiles) {
    const row = p as Record<string, unknown>;
    const venueId = String(row.venueId || '');
    if (!venueId) continue;
    profileByVenueId.set(venueId, {
      id: String(row.id),
      username: String(row.username || ''),
    });
  }

  const pending: AdminVenueInstagramQueueItem[] = [];
  const noMatch: AdminVenueInstagramQueueItem[] = [];
  const withSuggestions: AdminVenueInstagramQueueItem[] = [];
  const monitored: AdminVenueInstagramQueueItem[] = [];
  let hiddenNotPriority = 0;

  for (const doc of venueDocs) {
    const raw = doc as Record<string, unknown>;
    if (!isStoredVenueDiscoveryPriority(raw)) {
      hiddenNotPriority += 1;
      continue;
    }

    const profile = profileByVenueId.get(String(raw.id));
    const item = toQueueItem(raw, profile);
    const searchedAt = raw.instagramDiscoverSearchedAt;
    const outcome = String(raw.instagramDiscoverOutcome || '');

    if (profile) {
      monitored.push(item);
    } else if (!searchedAt) {
      pending.push(item);
    } else if (outcome === 'no_match') {
      noMatch.push(item);
    } else if (outcome === 'candidates' || outcome === 'known_username') {
      withSuggestions.push(item);
    } else {
      noMatch.push(item);
    }
  }

  const byName = (a: AdminVenueInstagramQueueItem, b: AdminVenueInstagramQueueItem) =>
    a.name.localeCompare(b.name, 'pt-BR');
  pending.sort(byName);
  noMatch.sort(byName);
  withSuggestions.sort(byName);
  monitored.sort(byName);

  return {
    pending,
    noMatch,
    withSuggestions,
    monitored,
    counts: {
      pending: pending.length,
      noMatch: noMatch.length,
      withSuggestions: withSuggestions.length,
      monitored: monitored.length,
      totalOsmInDb: venueDocs.length,
      hiddenNotPriority,
    },
  };
}

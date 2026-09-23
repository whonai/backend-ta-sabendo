import VenueModel from '../../models/venue';
import { createInstagramAdapter } from '../../instagram/adapters/createInstagramAdapter';
import MonitoredInstagramProfileModel from '../../models/monitoredInstagramProfile';

export type InstagramDiscoverCandidate = {
  username: string;
  fullName?: string;
  profilePicUrl?: string;
};

export type InstagramDiscoverResult = {
  venueId: string;
  venueName: string;
  source: 'venue_record' | 'osm' | 'instagram_search' | 'already_monitored' | 'none';
  username: string | null;
  candidates: InstagramDiscoverCandidate[];
  message?: string;
};

function pickSearchQuery(name: string, neighborhood?: string): string {
  const base = name.replace(/\s+/g, ' ').trim();
  if (neighborhood && !base.toLowerCase().includes(neighborhood.toLowerCase().slice(0, 8))) {
    return `${base} ${neighborhood}`.slice(0, 80);
  }
  return base.slice(0, 80);
}

export async function discoverInstagramForVenue(venueId: string): Promise<InstagramDiscoverResult> {
  const venue = await VenueModel.findOne({ id: venueId }).lean();
  if (!venue) {
    throw new Error('Venue não encontrado');
  }

  const v = venue as Record<string, unknown>;
  const venueName = String(v.name || '');
  const storedIg = String(v.instagramUsername || '').replace(/^@/, '').toLowerCase();

  const monitored = await MonitoredInstagramProfileModel.findOne({ venueId }).lean();
  if (monitored) {
    return {
      venueId,
      venueName,
      source: 'already_monitored',
      username: String(monitored.username),
      candidates: [],
      message: 'Perfil Instagram já vinculado a este estabelecimento.',
    };
  }

  if (storedIg) {
    return {
      venueId,
      venueName,
      source: v.instagramSource === 'osm' ? 'osm' : 'venue_record',
      username: storedIg,
      candidates: [{ username: storedIg, fullName: venueName }],
      message: 'Username já conhecido no cadastro do venue (ex.: tag OSM).',
    };
  }

  if ((process.env.INSTAGRAM_ADAPTER || 'instagrapi').toLowerCase() === 'mock') {
    return {
      venueId,
      venueName,
      source: 'none',
      username: null,
      candidates: [],
      message: 'INSTAGRAM_ADAPTER=mock — configure sessão real para buscar @.',
    };
  }

  const adapter = createInstagramAdapter();
  const query = pickSearchQuery(venueName, String(v.neighborhood || ''));

  await sleep(Number(process.env.INSTAGRAM_DISCOVER_DELAY_MS || '2500'));
  let candidates;
  try {
    candidates = await adapter.searchUsers(query, 5);
  } catch (err: unknown) {
    const { formatInstagramHttpError } = await import('./instagramApiErrors');
    const mapped = formatInstagramHttpError(err);
    const e = new Error(mapped.message);
    (e as Error & { httpStatus?: number; errorCode?: string; detail?: string }).httpStatus =
      mapped.status;
    (e as Error & { errorCode?: string }).errorCode = mapped.code;
    (e as Error & { detail?: string }).detail = mapped.detail;
    throw e;
  }

  const best = candidates[0]?.username || null;

  return {
    venueId,
    venueName,
    source: best ? 'instagram_search' : 'none',
    username: best,
    candidates,
    message: best
      ? 'Sugestão automática — confirme antes de monitorar.'
      : 'Nenhum perfil encontrado na busca.',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

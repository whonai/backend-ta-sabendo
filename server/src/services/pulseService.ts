import { AppEvent, CityPulse, UrbanReport } from '../types';
import { isEventLiveNow, isEventRelevantForPulse } from '../utils/eventSchedule';

function timeAgoFromIso(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours} h`;
  return `Há ${Math.floor(hours / 24)} dias`;
}

const HOTSPOT_TYPE_BY_CATEGORY: Record<string, string> = {
  shows: 'Shows & Música ao vivo',
  bares: 'Bares & Gastronomia',
  dj: 'Eletrônica & Nightlife',
  festas: 'Festas & Baladas',
  futebol: 'Futebol & Telões',
  feiras: 'Feiras & Mercados',
  cultural: 'Cultura & Encontros',
  universitario: 'Universitário',
  gastronomico: 'Gastronomia',
  teatro: 'Teatro & Artes',
  gratuito: 'Programação gratuita',
  espontaneo: 'Rolês espontâneos',
};

function dominantHotspotType(events: AppEvent[]): string {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.category] = (counts[e.category] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return (top && HOTSPOT_TYPE_BY_CATEGORY[top]) || 'Encontros & Cultura';
}

export function buildCityPulse(events: AppEvent[], reports: UrbanReport[], now = new Date()): CityPulse {
  const relevantEvents = events.filter(e => isEventRelevantForPulse(e, now));
  const liveEvents = relevantEvents.filter(e => isEventLiveNow(e, now));
  const floods = reports.filter(r => r.type === 'flooding' && r.status !== 'closed');

  const zoneScores: Record<
    string,
    { name: string; neighborhood: string; attendees: number; score: number; events: AppEvent[] }
  > = {};

  for (const e of relevantEvents) {
    const key = e.neighborhood;
    if (!zoneScores[key]) {
      zoneScores[key] = {
        name: e.venueName || e.neighborhood,
        neighborhood: e.neighborhood,
        attendees: 0,
        score: 0,
        events: [],
      };
    }
    zoneScores[key].events.push(e);
    zoneScores[key].attendees += e.currentAttendees + e.goingCount;
    zoneScores[key].score += e.reliabilityScore;
  }

  const hotspots = Object.values(zoneScores)
    .sort((a, b) => b.attendees - a.attendees)
    .slice(0, 5)
    .map(z => {
      const liveHere = z.events.some(e => isEventLiveNow(e, now));
      return {
        name: z.name,
        neighborhood: z.neighborhood,
        type: dominantHotspotType(z.events),
        attendees: z.attendees,
        activityScore: Math.min(
          99,
          Math.round(z.score / Math.max(1, z.events.length) + (liveHere ? 8 : 0))
        ),
        trend: (liveHere ? 'up' : z.attendees > 50 ? 'stable' : 'down') as 'up' | 'stable' | 'down',
      };
    });

  const criticalUrbanAlerts = reports
    .filter(r => r.type === 'flooding' || r.type === 'traffic_light' || r.type === 'traffic')
    .filter(r => r.status !== 'closed')
    .sort((a, b) => b.confirmationsCount - a.confirmationsCount)
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      type: r.type,
      location: `${r.streetName} (${r.neighborhood})`,
      timeAgo: timeAgoFromIso(r.lastConfirmedAt || r.createdAt),
      confirmations: r.confirmationsCount,
    }));

  const bustlingZonesCount = hotspots.filter(h => h.activityScore >= 75 || h.attendees >= 80).length;

  let cityMood: string;
  if (liveEvents.length >= 2) {
    cityMood = `${liveEvents.length} rolês acontecendo agora — a cidade tá movimentada`;
  } else if (relevantEvents.length >= 5) {
    cityMood = 'Agenda cheia nos próximos dias — vale ficar de olho no mapa';
  } else if (relevantEvents.length >= 1) {
    cityMood = 'Movimento moderado — confira o mapa para o que está rolando';
  } else {
    cityMood = 'Poucos eventos cadastrados para os próximos dias — cadastre ou confirme rolês';
  }

  return {
    activeEventsCount: relevantEvents.length,
    bustlingZonesCount: bustlingZonesCount || (hotspots.length > 0 ? hotspots.length : 0),
    confirmedFloodsCount: floods.length,
    cityMood,
    hotspots,
    criticalUrbanAlerts,
  };
}

import { Router } from 'express';
import VenueModel from '../models/venue';
import EventModel from '../models/event';
import { toAppEvent, toVenue } from '../mappers';
import { PUBLIC_EVENT_STATUS_FILTER } from '../utils/publicEvents';

const router = Router();

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get('/', async (req, res) => {
  const lat = req.query.lat !== undefined ? parseFloat(req.query.lat as string) : NaN;
  const lng = req.query.lng !== undefined ? parseFloat(req.query.lng as string) : NaN;
  const radius = parseFloat((req.query.radius as string) || '1000');

  const [venueDocs, eventDocs] = await Promise.all([
    VenueModel.find().lean(),
    EventModel.find(PUBLIC_EVENT_STATUS_FILTER).lean(),
  ]);

  const events = eventDocs.map(e => toAppEvent(e as Record<string, unknown>));
  const eventCountByVenue = new Map<string, number>();
  for (const e of events) {
    if (e.status === 'closed') continue;
    const key = e.venueId || e.venueName;
    eventCountByVenue.set(key, (eventCountByVenue.get(key) || 0) + 1);
  }

  let venues = venueDocs.map(v => {
    const raw = v as Record<string, unknown>;
    const base = toVenue(raw, Number(raw.activeEventsCount) || 0);
    const counted = eventCountByVenue.get(base.id) ?? eventCountByVenue.get(base.name);
    if (counted != null) base.activeEventsCount = counted;
    return base;
  });

  if (isNaN(lat) || isNaN(lng)) {
    return res.json(venues);
  }

  venues = venues
    .map(v => ({
      v,
      distance: haversineDistance(lat, lng, v.coordinates.lat, v.coordinates.lng),
    }))
    .filter(x => x.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .map(x => x.v);

  res.json(venues);
});

export default router;

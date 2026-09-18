import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import EventModel from '../models/event';
import MonitoredInstagramProfileModel from '../models/monitoredInstagramProfile';
import VenueModel from '../models/venue';
import { toAdminPendingEvent, toAppEvent } from '../mappers';
import { AdminPendingEvent, AppEvent, MonitoredInstagramProfile } from '../types';
import { dayLabelForEvent, ensureEventScheduleFields, formatYmdInBahia } from '../utils/eventSchedule';

const router = Router();

function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

router.get('/events/pending', async (_req, res) => {
  const rows = await EventModel.find({ status: 'pending' }).sort({ detectedAt: -1, createdAt: -1 }).lean();
  res.json(rows.map(r => toAdminPendingEvent(r as Record<string, unknown>)));
});

router.get('/events/:id', async (req, res) => {
  const raw = await EventModel.findOne({ id: req.params.id }).lean();
  if (!raw) return res.status(404).json({ message: 'Evento não encontrado' });
  const row = raw as Record<string, unknown>;
  const status = String(row.status || '');
  if (status === 'pending') {
    return res.json(toAdminPendingEvent(row));
  }
  res.json(toAppEvent(row));
});

router.patch('/events/:id', async (req, res) => {
  const raw = await EventModel.findOne({ id: req.params.id }).lean();
  if (!raw) return res.status(404).json({ message: 'Evento não encontrado' });

  const body = req.body as Partial<AdminPendingEvent>;
  const patch: Record<string, unknown> = { ...raw };
  const editable = [
    'title',
    'description',
    'date',
    'dayLabel',
    'startTime',
    'endTime',
    'price',
    'category',
    'venueId',
    'venueName',
    'address',
    'neighborhood',
    'coordinates',
    'imageUrl',
    'externalLink',
  ] as const;

  for (const key of editable) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  if (body.date || body.startTime || body.endTime) {
    const schedule = ensureEventScheduleFields({
      date: (patch.date as string) || formatYmdInBahia(new Date()),
      dayLabel: patch.dayLabel as string | undefined,
      startTime: (patch.startTime as string) || '',
      endTime: (patch.endTime as string) || undefined,
    });
    Object.assign(patch, schedule);
    if (body.date && !body.dayLabel) {
      patch.dayLabel = dayLabelForEvent(schedule.date, new Date());
    }
  }

  if (body.venueId) {
    const venue = await VenueModel.findOne({ id: body.venueId }).lean();
    if (venue) {
      const v = venue as Record<string, unknown>;
      patch.venueName = v.name;
      patch.address = v.address;
      patch.neighborhood = v.neighborhood;
      patch.coordinates = v.coordinates;
    }
  }

  patch.updatedAt = new Date().toISOString();
  await EventModel.findOneAndUpdate({ id: req.params.id }, patch, { upsert: true });
  const updated = await EventModel.findOne({ id: req.params.id }).lean();
  res.json(toAdminPendingEvent(updated as Record<string, unknown>));
});

router.post('/events/:id/approve', async (req, res) => {
  const raw = await EventModel.findOne({ id: req.params.id }).lean();
  if (!raw) return res.status(404).json({ message: 'Evento não encontrado' });

  const ev = toAppEvent(raw as Record<string, unknown>);
  ev.status = 'published';
  ev.updatedAt = new Date().toISOString();
  await EventModel.findOneAndUpdate({ id: ev.id }, { ...raw, ...ev, status: 'published', updatedAt: ev.updatedAt });
  res.json({ ...toAppEvent({ ...(raw as Record<string, unknown>), status: 'published', updatedAt: ev.updatedAt }), status: 'published' });
});

router.post('/events/:id/reject', async (req, res) => {
  const raw = await EventModel.findOne({ id: req.params.id }).lean();
  if (!raw) return res.status(404).json({ message: 'Evento não encontrado' });

  const updatedAt = new Date().toISOString();
  await EventModel.findOneAndUpdate(
    { id: req.params.id },
    { ...raw, status: 'rejected', updatedAt }
  );
  res.json({ success: true, id: req.params.id, status: 'rejected' });
});

router.get('/instagram-profiles', async (_req, res) => {
  const rows = await MonitoredInstagramProfileModel.find().sort({ username: 1 }).lean();
  res.json(rows as unknown as MonitoredInstagramProfile[]);
});

router.post('/instagram-profiles', async (req, res) => {
  const username = normalizeUsername(String(req.body?.username || ''));
  const venueId = String(req.body?.venueId || '').trim();
  if (!username || !venueId) {
    return res.status(400).json({ message: 'username e venueId são obrigatórios' });
  }

  const venue = await VenueModel.findOne({ id: venueId }).lean();
  if (!venue) {
    return res.status(400).json({ message: 'Estabelecimento (venueId) não encontrado' });
  }

  const existing = await MonitoredInstagramProfileModel.findOne({ username }).lean();
  if (existing) {
    return res.status(409).json({ message: 'Perfil já monitorado', profile: existing });
  }

  const now = new Date().toISOString();
  const profile: MonitoredInstagramProfile = {
    id: uuidv4(),
    username,
    instagramUrl: req.body?.instagramUrl || `https://instagram.com/${username}`,
    venueId,
    active: req.body?.active !== false,
    createdAt: now,
    updatedAt: now,
  };

  await MonitoredInstagramProfileModel.create(profile);
  res.status(201).json(profile);
});

router.post('/instagram/collect-once', async (_req, res) => {
  const { InstagramCollectorService } = await import('../services/instagram/InstagramCollectorService');
  const collector = InstagramCollectorService.createDefault();
  // eslint-disable-next-line no-console
  console.log('[Instagram] Coleta manual disparada via POST /api/admin/instagram/collect-once');
  try {
    await collector.runCollectionCycle();
    res.json({ success: true, message: 'Coleta concluída — veja os logs no terminal do server' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[Instagram] Coleta manual falhou:', message);
    res.status(500).json({ success: false, message });
  }
});

router.patch('/instagram-profiles/:id', async (req, res) => {
  const profile = await MonitoredInstagramProfileModel.findOne({ id: req.params.id });
  if (!profile) return res.status(404).json({ message: 'Perfil não encontrado' });

  if (req.body?.venueId) {
    const venue = await VenueModel.findOne({ id: String(req.body.venueId) }).lean();
    if (!venue) return res.status(400).json({ message: 'venueId inválido' });
    profile.set('venueId', venue.id);
  }
  if (req.body?.username) profile.set('username', normalizeUsername(String(req.body.username)));
  if (req.body?.instagramUrl) profile.set('instagramUrl', String(req.body.instagramUrl));
  if (typeof req.body?.active === 'boolean') profile.set('active', req.body.active);
  profile.set('updatedAt', new Date().toISOString());
  await profile.save();
  res.json(profile.toObject());
});

export default router;

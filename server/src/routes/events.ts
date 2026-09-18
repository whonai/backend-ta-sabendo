import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import EventModel from '../models/event';
import { AppEvent, ReputationLevel } from '../types';
import { toAppEvent } from '../mappers';
import { dayLabelForEvent, ensureEventScheduleFields, formatYmdInBahia } from '../utils/eventSchedule';
import { getRequestUserId, requireAuth } from '../middleware/requireAuth';
import {
  addParticipationOnce,
  applyUserFlagsToEvent,
  getUserEngagementFlags,
  syncEventEngagementToDocument,
  toggleParticipation,
} from '../services/eventEngagement';
import { isPublicEventStatus, PUBLIC_EVENT_STATUS_FILTER } from '../utils/publicEvents';

const router = Router();

const DEFAULT_CREATOR = {
  id: 'usr_community',
  name: 'Comunidade Tá Rolando',
  reputationLevel: 'Colaborador' as ReputationLevel,
  trustworthinessScore: 85,
};

async function findEventMapped(id: string, userId: string | null): Promise<AppEvent | null> {
  await syncEventEngagementToDocument(id);
  const raw = await EventModel.findOne({ id }).lean();
  if (!raw) return null;
  const event = toAppEvent(raw as Record<string, unknown>);
  const flags = await getUserEngagementFlags(id, userId);
  return applyUserFlagsToEvent(event, flags);
}

async function saveEvent(event: AppEvent): Promise<AppEvent> {
  const schedule = ensureEventScheduleFields(event);
  const normalized: AppEvent = { ...event, ...schedule };
  await EventModel.findOneAndUpdate({ id: normalized.id }, normalized, { upsert: true, new: true });
  return normalized;
}

async function mapEventList(rows: Record<string, unknown>[], userId: string | null): Promise<AppEvent[]> {
  const ids = rows.map(r => String(r.id));
  await Promise.all(ids.map(id => syncEventEngagementToDocument(id)));
  const refreshed = await EventModel.find({ id: { $in: ids } }).lean();
  const events = refreshed.map(r => toAppEvent(r as Record<string, unknown>));
  if (!userId) return events;
  return Promise.all(
    events.map(async ev => {
      const flags = await getUserEngagementFlags(ev.id, userId);
      return applyUserFlagsToEvent(ev, flags);
    })
  );
}

router.get('/', async (req, res) => {
  const { category, date, neighborhood } = req.query as Record<string, string | undefined>;
  const filter: Record<string, string> = {};
  if (category) filter.category = category;
  if (date) filter.date = date;
  if (neighborhood) filter.neighborhood = neighborhood;

  const rows = await EventModel.find({ ...filter, ...PUBLIC_EVENT_STATUS_FILTER }).lean();
  const userId = getRequestUserId(req);
  res.json(await mapEventList(rows as Record<string, unknown>[], userId));
});

router.get('/:id', async (req, res) => {
  const userId = getRequestUserId(req);
  const raw = await EventModel.findOne({ id: req.params.id }).lean();
  const row = raw as Record<string, unknown> | null;
  if (!row || !isPublicEventStatus(String(row.status || ''))) {
    return res.status(404).json({ message: 'Evento não encontrado' });
  }
  const ev = await findEventMapped(req.params.id, userId);
  if (!ev) return res.status(404).json({ message: 'Evento não encontrado' });
  res.json(ev);
});

router.post('/', async (req, res) => {
  const body = req.body as Partial<AppEvent>;
  const id = uuidv4();
  const now = new Date();
  const nowIso = now.toISOString();
  const schedule = ensureEventScheduleFields(
    {
      date: body.date || formatYmdInBahia(now),
      dayLabel: body.dayLabel,
      startTime: body.startTime || '20:00',
      endTime: body.endTime,
    },
    now
  );
  if (!body.dayLabel) {
    schedule.dayLabel = dayLabelForEvent(schedule.date, now);
  }

  const newEvent: AppEvent = {
    id,
    title: body.title || 'Sem título',
    description: body.description || '',
    category: body.category || 'espontaneo',
    venueName: body.venueName || '',
    address: body.address || '',
    neighborhood: body.neighborhood || 'Centro',
    coordinates: body.coordinates || { lat: -12.2575, lng: -38.9668 },
    date: schedule.date,
    dayLabel: schedule.dayLabel,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    price: body.price || 'Gratuito',
    imageUrl:
      body.imageUrl ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    externalLink: body.externalLink,
    interestedCount: 0,
    goingCount: 0,
    currentAttendees: 0,
    status: 'unconfirmed',
    origin: body.origin || 'user',
    venueId: body.venueId,
    confirmationsCount: 0,
    disputesCount: 0,
    evidenceCount: 0,
    reliabilityScore: 50,
    createdBy: body.createdBy || DEFAULT_CREATOR,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await saveEvent(newEvent);
    res.status(201).json(newEvent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ message: 'Erro criando evento', error: message });
  }
});

router.post('/:id/rsvp', requireAuth, async (req, res) => {
  const userId = getRequestUserId(req)!;
  const type = req.body?.type === 'interested' ? 'interested' : 'going';
  const exists = await EventModel.findOne({ id: req.params.id }).lean();
  if (!exists) return res.status(404).json({ message: 'Evento não encontrado' });

  await toggleParticipation(req.params.id, userId, type);
  const ev = await findEventMapped(req.params.id, userId);
  if (!ev) return res.status(404).json({ message: 'Evento não encontrado' });
  res.json({ success: true, event: ev });
});

router.post('/:id/check-in', requireAuth, async (req, res) => {
  const userId = getRequestUserId(req)!;
  const exists = await EventModel.findOne({ id: req.params.id }).lean();
  if (!exists) return res.status(404).json({ message: 'Evento não encontrado' });

  await addParticipationOnce(req.params.id, userId, 'check_in');
  res.json({ success: true });
});

router.post('/:id/confirm', requireAuth, async (req, res) => {
  const userId = getRequestUserId(req)!;
  const exists = await EventModel.findOne({ id: req.params.id }).lean();
  if (!exists) return res.status(404).json({ message: 'Evento não encontrado' });

  await addParticipationOnce(req.params.id, userId, 'confirm');
  const ev = await findEventMapped(req.params.id, userId);
  if (!ev) return res.status(404).json({ message: 'Evento não encontrado' });
  res.json(ev);
});

router.post('/:id/dispute', requireAuth, async (req, res) => {
  const userId = getRequestUserId(req)!;
  const exists = await EventModel.findOne({ id: req.params.id }).lean();
  if (!exists) return res.status(404).json({ message: 'Evento não encontrado' });

  await addParticipationOnce(req.params.id, userId, 'dispute');
  const ev = await findEventMapped(req.params.id, userId);
  if (!ev) return res.status(404).json({ message: 'Evento não encontrado' });
  res.json(ev);
});

export default router;

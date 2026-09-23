import { Router } from 'express';
import EventModel from '../models/event';
import ModerationFlagModel from '../models/moderationFlag';
import { toAppEvent } from '../mappers';
import { AppEvent, ModerationFlag } from '../types';
import adminInstagramRouter from './adminInstagram';
import adminVenuesRouter from './adminVenues';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

router.use(requireAdmin);

router.use(adminVenuesRouter);
router.use(adminInstagramRouter);

router.get('/pending-events', async (_req, res) => {
  const rows = await EventModel.find({ status: 'unconfirmed' }).lean();
  res.json(rows.map(r => toAppEvent(r as Record<string, unknown>)));
});

router.patch('/events/:id/approve', async (req, res) => {
  const raw = await EventModel.findOne({ id: req.params.id }).lean();
  if (!raw) return res.status(404).json({ message: 'Evento não encontrado' });

  const ev = toAppEvent(raw as Record<string, unknown>);
  ev.status = 'confirmed';
  ev.updatedAt = new Date().toISOString();
  await EventModel.findOneAndUpdate({ id: ev.id }, ev, { upsert: true });
  res.json(ev);
});

router.patch('/events/:id/reject', async (req, res) => {
  const result = await EventModel.deleteOne({ id: req.params.id });
  if (!result.deletedCount) {
    return res.status(404).json({ message: 'Evento não encontrado' });
  }
  res.json({ success: true });
});

router.get('/flags', async (_req, res) => {
  const flags = await ModerationFlagModel.find().lean();
  res.json(flags as unknown as ModerationFlag[]);
});

router.patch('/flags/:id/resolve', async (req, res) => {
  const flag = await ModerationFlagModel.findOne({ id: req.params.id });
  if (!flag) return res.status(404).json({ message: 'Flag não encontrada' });

  flag.set({ status: 'resolved', updatedAt: new Date().toISOString() });
  await flag.save();
  res.json({ success: true });
});

router.post('/broadcast', async (req, res) => {
  const message = req.body?.message;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'message é obrigatório' });
  }
  // eslint-disable-next-line no-console
  console.log('[admin broadcast]', message);
  res.json({ success: true });
});

export default router;

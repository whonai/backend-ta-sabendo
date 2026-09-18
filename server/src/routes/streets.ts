import { Router } from 'express';
import StreetModel from '../models/street';
import { StreetSegment } from '../types';
import { toStreetSegment } from '../mappers';

const router = Router();

router.get('/', async (_req, res) => {
  const rows = await StreetModel.find().lean();
  res.json(rows.map(r => toStreetSegment(r as Record<string, unknown>)));
});

router.post('/:id/rate', async (req, res) => {
  const condition = req.body?.condition as 'good' | 'attention' | 'bad' | undefined;
  if (!condition || !['good', 'attention', 'bad'].includes(condition)) {
    return res.status(400).json({ message: 'condition deve ser good, attention ou bad' });
  }

  const raw = await StreetModel.findOne({ id: req.params.id }).lean();
  if (!raw) return res.status(404).json({ message: 'Trecho não encontrado' });

  const segment = toStreetSegment(raw as Record<string, unknown>);
  segment.evaluationsCount += 1;
  segment.condition = condition;
  segment.confidenceScore = Math.min(99, segment.confidenceScore + 2);
  segment.lastUpdated = 'Agora';
  segment.history = [
    { date: 'Hoje', condition, evaluations: 1 },
    ...segment.history.slice(0, 4),
  ];

  await StreetModel.findOneAndUpdate({ id: segment.id }, segment, { upsert: true });
  res.json(segment);
});

export default router;

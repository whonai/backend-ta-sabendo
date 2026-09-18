import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import UrbanReportModel from '../models/urbanReport';
import { ReputationLevel, UrbanReport } from '../types';
import { toUrbanReport } from '../mappers';

const router = Router();

const DEFAULT_CREATOR = {
  id: 'usr_community',
  name: 'Comunidade',
  reputationLevel: 'Colaborador' as ReputationLevel,
};

async function findReportMapped(id: string): Promise<UrbanReport | null> {
  const raw = await UrbanReportModel.findOne({ id }).lean();
  if (!raw) return null;
  return toUrbanReport(raw as Record<string, unknown>);
}

async function saveReport(report: UrbanReport): Promise<UrbanReport> {
  await UrbanReportModel.findOneAndUpdate({ id: report.id }, report, { upsert: true, new: true });
  return report;
}

router.get('/', async (req, res) => {
  const { type, neighborhood } = req.query as Record<string, string | undefined>;
  const filter: Record<string, string> = {};
  if (type) filter.type = type;
  if (neighborhood) filter.neighborhood = neighborhood;

  const rows = await UrbanReportModel.find(filter).lean();
  res.json(rows.map(r => toUrbanReport(r as Record<string, unknown>)));
});

router.post('/', async (req, res) => {
  const body = req.body as Partial<UrbanReport>;
  const now = new Date().toISOString();
  const newReport: UrbanReport = {
    id: uuidv4(),
    type: body.type || 'other',
    title: body.title || body.description || 'Relato urbano',
    description: body.description,
    streetName: body.streetName || '',
    neighborhood: body.neighborhood || 'Centro',
    coordinates: body.coordinates || { lat: -12.2575, lng: -38.9668 },
    status: 'unconfirmed',
    confirmationsCount: 1,
    disputesCount: 0,
    reliabilityScore: 60,
    imageUrl: body.imageUrl,
    createdBy: body.createdBy || DEFAULT_CREATOR,
    createdAt: now,
    lastConfirmedAt: now,
  };

  try {
    await saveReport(newReport);
    res.status(201).json(newReport);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ message: 'Erro criando relato', error: message });
  }
});

router.post('/:id/confirm', async (req, res) => {
  const rep = await findReportMapped(req.params.id);
  if (!rep) return res.status(404).json({ message: 'Relato não encontrado' });

  const now = new Date().toISOString();
  rep.confirmationsCount += 1;
  rep.hasUserConfirmed = true;
  rep.reliabilityScore = Math.min(99, rep.reliabilityScore + 10);
  if (rep.status === 'unconfirmed') rep.status = 'confirmed';
  if (rep.confirmationsCount >= 15) rep.status = 'high_confidence';
  rep.lastConfirmedAt = now;

  await saveReport(rep);
  res.json(rep);
});

router.post('/:id/dispute', async (req, res) => {
  const rep = await findReportMapped(req.params.id);
  if (!rep) return res.status(404).json({ message: 'Relato não encontrado' });

  rep.disputesCount += 1;
  rep.reliabilityScore = Math.max(0, rep.reliabilityScore - 10);
  if (rep.disputesCount >= 3) rep.status = 'disputed';

  await saveReport(rep);
  res.json(rep);
});

export default router;

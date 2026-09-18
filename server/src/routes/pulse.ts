import { Request, Response, Router } from 'express';
import EventModel from '../models/event';
import UrbanReportModel from '../models/urbanReport';
import { buildCityPulse } from '../services/pulseService';
import { toAppEvent, toUrbanReport } from '../mappers';
import { PUBLIC_EVENT_STATUS_FILTER } from '../utils/publicEvents';

export async function pulseHandler(_req: Request, res: Response) {
  const [eventsRaw, reportsRaw] = await Promise.all([
    EventModel.find(PUBLIC_EVENT_STATUS_FILTER).lean(),
    UrbanReportModel.find().lean(),
  ]);
  const events = eventsRaw.map(e => toAppEvent(e as Record<string, unknown>));
  const reports = reportsRaw.map(r => toUrbanReport(r as Record<string, unknown>));
  res.json(buildCityPulse(events, reports, new Date()));
}

const router = Router();
router.get('/', pulseHandler);

export default router;

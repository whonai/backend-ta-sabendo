import EventModel from '../models/event';
import UrbanReportModel from '../models/urbanReport';
import ModerationFlagModel from '../models/moderationFlag';
import {
  buildSeedEvents,
  buildSeedUrbanReports,
  CURATED_EVENT_IDS,
  CURATED_URBAN_REPORT_IDS,
} from '../seedData';
import { toAppEvent } from '../mappers';
import { isEventPast } from '../utils/eventSchedule';
import { AppEvent } from '../types';
import { realignAllEventEngagement } from './eventEngagement';

/**
 * Regrava no Mongo apenas o catálogo curado (ids fixos do seed),
 * com datas/horários relativos a “hoje” em America/Bahia.
 * Eventos criados pela comunidade (outros ids) não são alterados.
 */
export async function syncCuratedCatalog(now = new Date()): Promise<void> {
  const events = buildSeedEvents(now);
  for (const event of events) {
    const doc = { ...event };
    if (isEventPast(doc, now) && doc.status !== 'unconfirmed') {
      doc.status = 'closed';
      doc.currentAttendees = 0;
    }
    await EventModel.updateOne({ id: doc.id }, { $set: doc }, { upsert: true });
  }

  const reports = buildSeedUrbanReports(now);
  for (const report of reports) {
    await UrbanReportModel.findOneAndUpdate({ id: report.id }, report, { upsert: true });
  }

  const reportedAt = new Date(now.getTime() - 2 * 3600000).toISOString();
  await realignAllEventEngagement();

  await ModerationFlagModel.findOneAndUpdate(
    { id: 'mod_1' },
    {
      id: 'mod_1',
      targetId: 'evt_futebol_bar',
      targetType: 'event',
      targetTitle: 'Transmissão Ao Vivo: Bahia x Vitória no Bar do Zé',
      reason: 'wrong_location',
      reasonLabel: 'Localização incorreta',
      reportedAt,
      status: 'pending',
      reportedBy: 'usr_denuncia_42',
      notes: 'A entrada fica na rua lateral, sugeriu ajustar o pin',
    },
    { upsert: true }
  );
}

export async function closeStaleNonCuratedPastEvents(now = new Date()): Promise<number> {
  const all = await EventModel.find({ id: { $nin: CURATED_EVENT_IDS } }).lean();
  let closed = 0;
  for (const raw of all) {
    const event = toAppEvent(raw as Record<string, unknown>) as AppEvent;
    if (event.status === 'closed') continue;
    if (isEventPast(event, now)) {
      await EventModel.updateOne({ id: event.id }, { status: 'closed', currentAttendees: 0 });
      closed += 1;
    }
  }
  return closed;
}

export { CURATED_EVENT_IDS, CURATED_URBAN_REPORT_IDS };

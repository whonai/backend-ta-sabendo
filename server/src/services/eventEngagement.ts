import { v4 as uuidv4 } from 'uuid';
import EventModel from '../models/event';
import EventParticipationModel, { ParticipationKind } from '../models/eventParticipation';
import { AppEvent, EventStatus } from '../types';

export type EngagementCounts = {
  confirmationsCount: number;
  goingCount: number;
  interestedCount: number;
  currentAttendees: number;
  disputesCount: number;
};

export type UserEngagementFlags = {
  hasUserConfirmed?: boolean;
  hasUserRsvpGoing?: boolean;
  hasUserRsvpInterested?: boolean;
  hasUserCheckedIn?: boolean;
};

function deriveStatus(event: AppEvent, counts: EngagementCounts): EventStatus {
  if (counts.disputesCount >= 3) return 'disputed';
  if (event.status === 'closed') return 'closed';
  if (counts.confirmationsCount >= 15) return 'high_confidence';
  if (counts.confirmationsCount >= 1) {
    return 'confirmed';
  }
  return 'unconfirmed';
}

function deriveReliabilityScore(counts: EngagementCounts, base = 50): number {
  const score =
    base +
    counts.confirmationsCount * 3 +
    counts.goingCount * 1 +
    counts.currentAttendees * 2 -
    counts.disputesCount * 10;
  return Math.max(0, Math.min(99, Math.round(score)));
}

export async function countEngagement(eventId: string): Promise<EngagementCounts> {
  const rows = await EventParticipationModel.find({ eventId }).lean();
  return {
    confirmationsCount: rows.filter(r => r.kind === 'confirm').length,
    goingCount: rows.filter(r => r.kind === 'going').length,
    interestedCount: rows.filter(r => r.kind === 'interested').length,
    currentAttendees: rows.filter(r => r.kind === 'check_in').length,
    disputesCount: rows.filter(r => r.kind === 'dispute').length,
  };
}

export async function getUserEngagementFlags(
  eventId: string,
  userId: string | null
): Promise<UserEngagementFlags> {
  if (!userId) return {};
  const rows = await EventParticipationModel.find({ eventId, userId }).lean();
  const kinds = new Set(rows.map(r => r.kind));
  return {
    hasUserConfirmed: kinds.has('confirm'),
    hasUserRsvpGoing: kinds.has('going'),
    hasUserRsvpInterested: kinds.has('interested'),
    hasUserCheckedIn: kinds.has('check_in'),
  };
}

/** Recalcula contadores no documento do evento a partir de participações reais. */
export async function syncEventEngagementToDocument(eventId: string): Promise<AppEvent | null> {
  const raw = await EventModel.findOne({ id: eventId }).lean();
  if (!raw) return null;

  const counts = await countEngagement(eventId);
  const rawEvent = raw as unknown as AppEvent;
  const base = Number(rawEvent.reliabilityScore) || 50;
  const status = deriveStatus(rawEvent, counts);
  const reliabilityScore = deriveReliabilityScore(counts, Math.min(base, 55));

  await EventModel.updateOne(
    { id: eventId },
    {
      $set: {
        ...counts,
        status,
        reliabilityScore,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  const updated = await EventModel.findOne({ id: eventId }).lean();
  return updated as AppEvent | null;
}

const TOGGLE_KINDS: ParticipationKind[] = ['going', 'interested'];

export async function setParticipation(
  eventId: string,
  userId: string,
  kind: ParticipationKind,
  active: boolean
): Promise<EngagementCounts> {
  const filter = { eventId, userId, kind };

  if (active) {
    await EventParticipationModel.updateOne(
      filter,
      {
        $setOnInsert: {
          id: uuidv4(),
          eventId,
          userId,
          kind,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  } else {
    await EventParticipationModel.deleteOne(filter);
  }

  await syncEventEngagementToDocument(eventId);
  return countEngagement(eventId);
}

/** Confirm / check-in / dispute: uma vez por usuário (não toggle). */
export async function addParticipationOnce(
  eventId: string,
  userId: string,
  kind: ParticipationKind
): Promise<{ added: boolean; counts: EngagementCounts }> {
  const existing = await EventParticipationModel.findOne({ eventId, userId, kind }).lean();
  if (existing) {
    const counts = await countEngagement(eventId);
    return { added: false, counts };
  }

  await EventParticipationModel.create({
    id: uuidv4(),
    eventId,
    userId,
    kind,
    createdAt: new Date().toISOString(),
  });

  await syncEventEngagementToDocument(eventId);
  const counts = await countEngagement(eventId);
  return { added: true, counts };
}

export async function toggleParticipation(
  eventId: string,
  userId: string,
  kind: 'going' | 'interested'
): Promise<EngagementCounts> {
  if (!TOGGLE_KINDS.includes(kind)) {
    throw new Error('Tipo inválido para toggle');
  }
  const existing = await EventParticipationModel.findOne({ eventId, userId, kind }).lean();
  return setParticipation(eventId, userId, kind, !existing);
}

export function applyUserFlagsToEvent(event: AppEvent, flags: UserEngagementFlags): AppEvent {
  return { ...event, ...flags };
}

/** Zera contadores fake e realinha todos os eventos com a coleção de participações. */
export async function realignAllEventEngagement(): Promise<void> {
  const ids = await EventModel.find({}, { id: 1 }).lean();
  for (const row of ids) {
    await syncEventEngagementToDocument(String(row.id));
  }
}

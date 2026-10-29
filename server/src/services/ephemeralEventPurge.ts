import EventModel from '../models/event';
import EventParticipationModel from '../models/eventParticipation';
import ModerationFlagModel from '../models/moderationFlag';
import InstagramStoryModel from '../models/instagramStory';
import { toAppEvent } from '../mappers';
import { AppEvent } from '../types';
import { isPastLiveConfirmationWindow } from '../utils/eventSchedule';
import { isEphemeralEvent } from '../utils/ephemeralEvents';

export async function purgeEventById(eventId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await Promise.all([
    EventParticipationModel.deleteMany({ eventId }),
    ModerationFlagModel.deleteMany({ targetType: 'event', targetId: eventId }),
    InstagramStoryModel.updateMany(
      { linkedEventId: eventId },
      {
        $unset: { linkedEventId: 1 },
        $set: { updatedAt: nowIso },
      }
    ),
    EventModel.deleteOne({ id: eventId }),
  ]);
}

export function isEphemeralEventExpired(event: AppEvent, now = new Date()): boolean {
  if (!isEphemeralEvent(event)) return false;
  return isPastLiveConfirmationWindow(event, now);
}

/** Eventos efêmeros com início + 3h < now (exclui catálogo curado). */
export async function findExpiredEphemeralEvents(now = new Date()): Promise<AppEvent[]> {
  const rows = await EventModel.find({}).lean();
  const expired: AppEvent[] = [];
  for (const raw of rows) {
    const event = toAppEvent(raw as Record<string, unknown>);
    if (isEphemeralEventExpired(event, now)) {
      expired.push(event);
    }
  }
  return expired;
}

export async function purgeExpiredEphemeralEvents(now = new Date()): Promise<string[]> {
  const expired = await findExpiredEphemeralEvents(now);
  const purged: string[] = [];
  for (const event of expired) {
    await purgeEventById(event.id);
    purged.push(event.id);
  }
  if (purged.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[ephemeral] Purged ${purged.length} event(s): ${purged.join(', ')}`);
  }
  return purged;
}

import { CURATED_EVENT_IDS } from '../seedData';
import { AppEvent } from '../types';
import { isPastLiveConfirmationWindow } from './eventSchedule';

/** Catálogo curado (seed) — não entra em purge efêmero nem no card “tá rolando?”. */
export function isCuratedCatalogEventId(eventId: string): boolean {
  return CURATED_EVENT_IDS.includes(eventId);
}

export function isEphemeralEvent(event: Pick<AppEvent, 'id'>): boolean {
  return !isCuratedCatalogEventId(event.id);
}

export function shouldHideEphemeralFromPublicLists(event: AppEvent, now = new Date()): boolean {
  if (!isEphemeralEvent(event)) return false;
  return isPastLiveConfirmationWindow(event, now);
}

/** Omite currentAttendees quando não há check-ins reais (evita “0 pessoas” no front). */
export function sanitizeEventAttendeesForApi<T extends AppEvent>(event: T): T {
  if (!event.currentAttendees || event.currentAttendees <= 0) {
    const copy = { ...event };
    delete (copy as { currentAttendees?: number }).currentAttendees;
    return copy;
  }
  return event;
}

export function filterEventsForPublicListing(events: AppEvent[], now = new Date()): AppEvent[] {
  return events
    .filter(e => !shouldHideEphemeralFromPublicLists(e, now))
    .map(sanitizeEventAttendeesForApi);
}

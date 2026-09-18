import EventModel from '../../models/event';

function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type DuplicateCheckResult = {
  isLikelyDuplicate: boolean;
  existingEventId?: string;
};

export async function findLikelyDuplicateEvent(params: {
  venueId: string;
  title: string | null;
  date: string | null;
  startTime: string | null;
}): Promise<DuplicateCheckResult> {
  const { venueId, title, date } = params;
  if (!title || !date) {
    return { isLikelyDuplicate: false };
  }

  const norm = normalizeTitle(title);
  if (!norm) return { isLikelyDuplicate: false };

  const candidates = await EventModel.find({
    venueId,
    date,
    status: { $in: ['pending', 'published', 'unconfirmed', 'confirmed', 'high_confidence'] },
  }).lean();

  for (const row of candidates) {
    const doc = row as Record<string, unknown>;
    const otherTitle = normalizeTitle(String(doc.title || ''));
    if (!otherTitle) continue;
    if (otherTitle === norm) {
      return { isLikelyDuplicate: true, existingEventId: String(doc.id) };
    }
    if (otherTitle.includes(norm) || norm.includes(otherTitle)) {
      return { isLikelyDuplicate: true, existingEventId: String(doc.id) };
    }
  }

  return { isLikelyDuplicate: false };
}

import { EventExtractionResult, ExtractedEventDraft } from '../../instagram/types';
import { formatYmdInBahia } from '../../utils/eventSchedule';

const EVENT_KEYWORDS = [
  'show',
  'live',
  'ao vivo',
  'samba',
  'pagode',
  'forró',
  'forro',
  'dj',
  'festa',
  'baile',
  'sertanejo',
  'rock',
  'mpb',
  'cover',
  'ingresso',
  'entrada',
  'couvert',
  'open bar',
  'happy hour',
];

const NON_EVENT_HINTS = [
  'bom dia',
  'boa tarde',
  'boa noite',
  'cardapio',
  'cardápio',
  'delivery',
  'ifood',
  'promoção',
  'promocao',
  'obrigado',
  'valeu',
  'selfie',
];

const MONTHS_PT: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
};

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parsePrice(text: string): number | null {
  const m = text.match(/r\$\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseTime(text: string): string | null {
  const m = text.match(/\b(\d{1,2})\s*[h:]\s*(\d{2})?\b/i);
  if (!m) return null;
  const h = Math.min(23, parseInt(m[1], 10));
  const min = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function parseDateYmd(text: string, reference: Date): { date: string | null; ambiguous: boolean } {
  const lower = normalizeText(text);
  const today = formatYmdInBahia(reference);
  const [y, mo, d] = today.split('-').map(Number);

  if (/\bamanh[aã]\b/.test(lower)) {
    const ref = new Date(reference);
    ref.setDate(ref.getDate() + 1);
    return { date: formatYmdInBahia(ref), ambiguous: false };
  }
  if (/\bhoje\b/.test(lower)) {
    return { date: today, ambiguous: false };
  }

  const dmY = text.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (dmY) {
    const day = parseInt(dmY[1], 10);
    const month = parseInt(dmY[2], 10);
    let year = dmY[3] ? parseInt(dmY[3], 10) : y;
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { date: null, ambiguous: true };
    }
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { date: iso, ambiguous: !dmY[3] };
  }

  const weekday = text.match(
    /\b(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)\b/i
  );
  if (weekday) {
    return { date: null, ambiguous: true };
  }

  return { date: null, ambiguous: false };
}

function guessTitle(lines: string[]): string | null {
  const candidates = lines
    .map(l => l.trim())
    .filter(l => l.length >= 3 && l.length <= 80)
    .filter(l => !/^\d{1,2}[/.-]\d{1,2}/.test(l))
    .filter(l => !/^r\$/i.test(l))
    .filter(l => !/^\d{1,2}\s*h/i.test(l));

  if (!candidates.length) return null;
  const scored = candidates.map(line => {
    const n = normalizeText(line);
    let score = 0;
    if (EVENT_KEYWORDS.some(k => n.includes(k))) score += 2;
    if (/^[A-ZÀ-Ü]/.test(line)) score += 1;
    return { line, score };
  });
  scored.sort((a, b) => b.score - a.score || b.line.length - a.line.length);
  const best = scored[0];
  if (!best || best.score === 0) {
    return candidates[0] || null;
  }
  return best.line;
}

function scoreEventLikelihood(text: string): number {
  const n = normalizeText(text);
  if (!n.trim()) return 0;
  let score = 0;
  for (const k of EVENT_KEYWORDS) {
    if (n.includes(k)) score += 0.12;
  }
  if (parseDateYmd(text, new Date()).date) score += 0.25;
  if (parseTime(text)) score += 0.2;
  if (parsePrice(text) != null) score += 0.15;
  for (const bad of NON_EVENT_HINTS) {
    if (n.includes(bad)) score -= 0.2;
  }
  return Math.max(0, Math.min(1, score));
}

export class EventExtractorService {
  extractFromText(
    rawText: string,
    establishmentId: string,
    sourceUrl: string | null,
    referenceDate: Date = new Date()
  ): EventExtractionResult {
    const text = rawText.trim();
    const confidence = scoreEventLikelihood(text);

    if (confidence < 0.35) {
      return { isEvent: false, confidence, reason: 'low_event_signals' };
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const title = guessTitle(lines);
    const { date, ambiguous } = parseDateYmd(text, referenceDate);
    const startTime = parseTime(text);
    const price = parsePrice(text);

    const hasDateOrTime = Boolean(date || startTime);
    const hasTitleOrKeyword = Boolean(title) || EVENT_KEYWORDS.some(k => normalizeText(text).includes(k));

    if (!hasDateOrTime || !hasTitleOrKeyword) {
      return { isEvent: false, confidence: confidence * 0.6, reason: 'missing_date_or_title' };
    }

    const incompleteFields: string[] = [];
    if (!title) incompleteFields.push('title');
    if (!date) incompleteFields.push('date');
    if (ambiguous) incompleteFields.push('date_ambiguous');
    if (!startTime) incompleteFields.push('startTime');
    if (price == null) incompleteFields.push('price');

    const event: ExtractedEventDraft = {
      title: title ? title.charAt(0).toUpperCase() + title.slice(1) : null,
      description: lines.slice(0, 6).join('\n') || null,
      date,
      startTime,
      endTime: null,
      price,
      venue: null,
      artist: null,
      category: null,
      source: 'instagram',
      sourceUrl,
      establishmentId,
    };

    const finalConfidence = Math.min(
      0.98,
      confidence + (date ? 0.1 : 0) + (startTime ? 0.05 : 0) - (ambiguous ? 0.15 : 0)
    );

    if (finalConfidence < 0.45) {
      return { isEvent: false, confidence: finalConfidence, reason: 'below_mvp_threshold' };
    }

    return {
      isEvent: true,
      confidence: finalConfidence,
      event,
      incompleteFields,
    };
  }
}

export function createEventExtractorService(): EventExtractorService {
  return new EventExtractorService();
}

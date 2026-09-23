import { EventExtractionResult, ExtractedEventDraft } from '../../instagram/types';
import { addDaysToYmd, formatYmdInBahia } from '../../utils/eventSchedule';

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
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  março: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

const WEEKDAY_PT: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  terça: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
  sábado: 6,
};

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Reduz ruído típico de OCR em stories. */
function cleanOcrText(text: string): string {
  return text
    .replace(/[|]{1,}/g, ' ')
    .replace(/[<>{}[\]\\^`~]/g, ' ')
    .replace(/\b(?:oo|ooo|fmss|hM)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map(w => {
      if (w.length <= 2 && !/^\d/.test(w)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function isLikelyPersonName(fragment: string): boolean {
  const t = fragment.trim();
  if (t.length < 3 || t.length > 48) return false;
  if (/^\d/.test(t)) return false;
  if (/^(show|live|dj|bar|festa|ingresso|entrada)$/i.test(t)) return false;
  if (/^r\$/i.test(t)) return false;
  return /[A-Za-zÀ-ú]/.test(t);
}

function parseArtistList(fragment: string): string[] {
  const parts = fragment
    .split(/\s*(?:,|&| e )\s*/i)
    .map(p => p.replace(/[.*\-–>|]+$/g, '').trim())
    .filter(isLikelyPersonName);
  return parts.map(titleCaseWords);
}

function extractArtists(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (names: string[]) => {
    for (const n of names) {
      const key = normalizeText(n);
      if (!seen.has(key) && isLikelyPersonName(n)) {
        seen.add(key);
        out.push(titleCaseWords(n));
      }
    }
  };

  const showDe = text.match(/\bshow\s+de\s+([^|\n>]{3,80})/i);
  if (showDe) {
    push(parseArtistList(showDe[1]));
  }

  const comRe = /\b(?:com|c\/|feat\.?|featuring|apresenta)\s+([^|\n]{3,120})/gi;
  let comM: RegExpExecArray | null;
  while ((comM = comRe.exec(text)) !== null) {
    push(parseArtistList(comM[1]));
  }

  const capsList = text.match(
    /\b([A-ZÀ-ÜÁÉÍÓÚÂÊÔÃÕÇ][A-ZÀ-ÜÁÉÍÓÚÂÊÔÃÕÇ.']{1,24}(?:\s+[A-ZÀ-ÜÁÉÍÓÚÂÊÔÃÕÇ][A-ZÀ-ÜÁÉÍÓÚÂÊÔÃÕÇ.']{1,24})?(?:\s*,\s*[A-ZÀ-Ü][A-ZÀ-ÜÁÉÍÓÚÂÊÔÃÕÇ.'\s]{1,24}){1,6})\b/g
  );
  if (capsList) {
    for (const block of capsList) {
      if (/show|varandinha|music|bar|ingresso/i.test(block)) continue;
      push(parseArtistList(block));
    }
  }

  return out.slice(0, 8);
}

function buildEventTitle(artists: string[], rawTitle: string | null): string | null {
  if (artists.length === 1) {
    return `Show — ${artists[0]}`;
  }
  if (artists.length > 1) {
    return `Show — ${artists.join(', ')}`;
  }
  if (rawTitle) {
    const cleaned = cleanOcrText(rawTitle);
    if (cleaned.length >= 4) {
      return titleCaseWords(cleaned.replace(/\bshow\s+de\b/i, 'Show de'));
    }
  }
  return rawTitle ? titleCaseWords(cleanOcrText(rawTitle)) : null;
}

function parsePrice(text: string): number | null {
  const m = text.match(/r\$\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseTime(text: string): string | null {
  const patterns = [
    /\b(?:às|as|a partir das?)\s*(\d{1,2})\s*[h:]\s*(\d{2})?\b/i,
    /\b(\d{1,2})\s*[h:]\s*(\d{2})\b/i,
    /\b(\d{1,2})\s*h\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const h = Math.min(23, parseInt(m[1], 10));
    const min = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  return null;
}

function bahiaWeekday(reference: Date): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bahia', weekday: 'short' })
    .format(reference)
    .toLowerCase();
  const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  return map[wd.slice(0, 3)] ?? 0;
}

function nextWeekdayYmd(weekday: number, reference: Date): string {
  const todayYmd = formatYmdInBahia(reference);
  const current = bahiaWeekday(reference);
  let delta = weekday - current;
  if (delta <= 0) delta += 7;
  return addDaysToYmd(todayYmd, delta);
}

function parseDateYmd(text: string, reference: Date): { date: string | null; ambiguous: boolean } {
  const lower = normalizeText(text);
  const today = formatYmdInBahia(reference);

  if (/\bamanh[aã]\b/.test(lower)) {
    return { date: addDaysToYmd(today, 1), ambiguous: false };
  }
  if (/\bhoje\b/.test(lower)) {
    return { date: today, ambiguous: false };
  }

  const dayMonthName = text.match(
    /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/i
  );
  if (dayMonthName) {
    const day = parseInt(dayMonthName[1], 10);
    const monthKey = normalizeText(dayMonthName[2].replace('ç', 'c'));
    const month = MONTHS_PT[monthKey];
    const year = reference.getFullYear();
    if (month && day >= 1 && day <= 31) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date: iso, ambiguous: false };
    }
  }

  const dmY = text.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (dmY) {
    const day = parseInt(dmY[1], 10);
    const month = parseInt(dmY[2], 10);
    let year = dmY[3] ? parseInt(dmY[3], 10) : reference.getFullYear();
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { date: null, ambiguous: true };
    }
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { date: iso, ambiguous: !dmY[3] };
  }

  const weekday = text.match(
    /\b(segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo)\b/i
  );
  if (weekday) {
    const key = normalizeText(weekday[1].split('-')[0]);
    const wd = WEEKDAY_PT[key];
    if (wd !== undefined) {
      return { date: nextWeekdayYmd(wd, reference), ambiguous: false };
    }
  }

  return { date: null, ambiguous: false };
}

function guessTitle(lines: string[]): string | null {
  const candidates = lines
    .map(l => cleanOcrText(l))
    .filter(l => l.length >= 3 && l.length <= 80)
    .filter(l => !/^\d{1,2}[/.-]\d{1,2}/.test(l))
    .filter(l => !/^r\$/i.test(l))
    .filter(l => !/^\d{1,2}\s*h/i.test(l));

  if (!candidates.length) return null;
  const scored = candidates.map(line => {
    const n = normalizeText(line);
    let score = 0;
    if (EVENT_KEYWORDS.some(k => n.includes(k))) score += 2;
    if (/\bshow\s+de\b/i.test(line)) score += 3;
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

function buildDescription(lines: string[], artists: string[]): string {
  const cleaned = lines.map(cleanOcrText).filter(l => l.length >= 2);
  const parts: string[] = [];
  if (artists.length) {
    parts.push(`Artistas: ${artists.join(', ')}`);
  }
  const body = cleaned
    .filter(l => !/^artistas?:/i.test(l))
    .slice(0, 5)
    .join('\n');
  if (body) parts.push(body);
  return parts.join('\n\n').slice(0, 600) || '';
}

function scoreEventLikelihood(text: string, reference: Date): number {
  const n = normalizeText(text);
  if (!n.trim()) return 0;
  let score = 0;
  for (const k of EVENT_KEYWORDS) {
    if (n.includes(k)) score += 0.12;
  }
  if (parseDateYmd(text, reference).date) score += 0.25;
  if (parseTime(text)) score += 0.2;
  if (parsePrice(text) != null) score += 0.15;
  if (extractArtists(text).length) score += 0.15;
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
    const text = cleanOcrText(rawText.trim());
    const confidence = scoreEventLikelihood(text, referenceDate);

    if (confidence < 0.35) {
      return { isEvent: false, confidence, reason: 'low_event_signals' };
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const artists = extractArtists(text);
    const rawTitle = guessTitle(lines);
    const title = buildEventTitle(artists, rawTitle);
    const { date, ambiguous } = parseDateYmd(text, referenceDate);
    const startTime = parseTime(text);
    const price = parsePrice(text);

    const storySchedule = referenceDate && !Number.isNaN(referenceDate.getTime());
    const fallbackDate =
      storySchedule && !date ? formatYmdInBahia(referenceDate) : null;
    const resolvedDate = date || fallbackDate;

    const hasDateOrTime = Boolean(resolvedDate || startTime);
    const hasTitleOrKeyword =
      Boolean(title) ||
      artists.length > 0 ||
      EVENT_KEYWORDS.some(k => normalizeText(text).includes(k));

    if (!hasDateOrTime || !hasTitleOrKeyword) {
      return { isEvent: false, confidence: confidence * 0.6, reason: 'missing_date_or_title' };
    }

    const incompleteFields: string[] = [];
    if (!title) incompleteFields.push('title');
    if (!resolvedDate) incompleteFields.push('date');
    if (ambiguous) incompleteFields.push('date_ambiguous');
    if (!date && fallbackDate) incompleteFields.push('date_from_story_post');
    if (!startTime) incompleteFields.push('startTime');
    if (price == null) incompleteFields.push('price');
    if (!artists.length) incompleteFields.push('artist');

    const artistJoined = artists.length ? artists.join(', ') : null;

    const event: ExtractedEventDraft = {
      title,
      description: buildDescription(lines, artists) || null,
      date: resolvedDate,
      startTime,
      endTime: null,
      price,
      venue: null,
      artist: artistJoined,
      artists: artists.length ? artists : undefined,
      category: 'shows',
      source: 'instagram',
      sourceUrl,
      establishmentId,
    };

    const finalConfidence = Math.min(
      0.98,
      confidence +
        (resolvedDate ? 0.1 : 0) +
        (startTime ? 0.05 : 0) +
        (artists.length ? 0.08 : 0) -
        (ambiguous ? 0.15 : 0) -
        (!date && fallbackDate ? 0.05 : 0)
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

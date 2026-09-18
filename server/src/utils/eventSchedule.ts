import { AppEvent } from '../types';

const TZ = 'America/Bahia';
const REF_CATALOG_YMD = '2026-09-04';
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(ymd: unknown): ymd is string {
  return typeof ymd === 'string' && YMD_RE.test(ymd);
}

export function formatYmdInBahia(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) {
    return formatYmdInBahia(new Date());
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value ?? '1970';
  const m = parts.find(p => p.type === 'month')?.value ?? '01';
  const d = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

export function dayDiffYmd(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T12:00:00-03:00`).getTime();
  const b = new Date(`${toYmd}T12:00:00-03:00`).getTime();
  return Math.round((b - a) / 86400000);
}

/** Soma dias em calendário (YYYY-MM-DD), sem drift de fuso. */
export function addDaysToYmd(ymd: string, days: number): string {
  if (!isValidYmd(ymd)) {
    throw new Error(`Data inválida: ${ymd}`);
  }
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  const nd = new Date(utc);
  const yy = nd.getUTCFullYear();
  const mm = String(nd.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(nd.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function shiftCatalogDate(anchorYmd: string, now = new Date()): string {
  if (!isValidYmd(anchorYmd)) {
    return formatYmdInBahia(now);
  }
  const nowYmd = formatYmdInBahia(now);
  const shift = dayDiffYmd(REF_CATALOG_YMD, nowYmd);
  return addDaysToYmd(anchorYmd, shift);
}

export function dayLabelForEvent(eventYmd: string, now = new Date()): string {
  if (!isValidYmd(eventYmd)) {
    return 'Data a confirmar';
  }
  const nowYmd = formatYmdInBahia(now);
  const diff = dayDiffYmd(nowYmd, eventYmd);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  const label = new Date(`${eventYmd}T12:00:00-03:00`).toLocaleDateString('pt-BR', {
    timeZone: TZ,
    weekday: 'long',
  });
  if (label === 'Invalid Date') return 'Data a confirmar';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Extrai date (YYYY-MM-DD) e HH:mm em horário de Feira a partir de ISO UTC. */
export function parseIsoToBahiaSchedule(iso?: string): { date: string; startTime: string } {
  if (!iso) {
    return { date: formatYmdInBahia(), startTime: '20:00' };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: formatYmdInBahia(), startTime: '20:00' };
  }
  const date = d.toLocaleDateString('en-CA', { timeZone: TZ });
  const startTime = d.toLocaleTimeString('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return { date, startTime };
}

export function normalizeHm(value: unknown, fallback = '20:00'): string {
  if (typeof value !== 'string' || !/^\d{1,2}:\d{2}$/.test(value.trim())) {
    return fallback;
  }
  const [h, m] = value.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Garante campos de agenda exigidos pelo front (ficha / Agora / Eventos). */
export function ensureEventScheduleFields(
  event: Pick<AppEvent, 'date' | 'dayLabel' | 'startTime' | 'endTime'>,
  now = new Date()
): Pick<AppEvent, 'date' | 'dayLabel' | 'startTime' | 'endTime'> {
  let date = isValidYmd(event.date) ? event.date : formatYmdInBahia(now);
  const startTime = normalizeHm(event.startTime);
  const endTime = event.endTime ? normalizeHm(event.endTime) : undefined;

  let dayLabel = event.dayLabel;
  if (!dayLabel || dayLabel === 'Invalid Date' || dayLabel.toLowerCase().includes('invalid')) {
    dayLabel = dayLabelForEvent(date, now);
  }

  return { date, dayLabel, startTime, endTime };
}

function parseTimeHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

/** Início/fim do evento em ms (horário de Feira, UTC-3). */
export function eventWindowMs(event: Pick<AppEvent, 'date' | 'startTime' | 'endTime'>): {
  startMs: number;
  endMs: number;
} {
  const date = isValidYmd(event.date) ? event.date : formatYmdInBahia();
  const { h: sh, m: sm } = parseTimeHm(event.startTime || '20:00');
  const startMs = new Date(
    `${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00-03:00`
  ).getTime();

  let endMs: number;
  if (event.endTime) {
    const { h: eh, m: em } = parseTimeHm(event.endTime);
    endMs = new Date(
      `${date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00-03:00`
    ).getTime();
    if (endMs <= startMs) endMs += 86400000;
  } else {
    endMs = startMs + 4 * 3600000;
  }
  return { startMs, endMs };
}

export function isEventLiveNow(event: AppEvent, now = new Date()): boolean {
  if (event.status === 'closed') return false;
  const { startMs, endMs } = eventWindowMs(event);
  const t = now.getTime();
  return t >= startMs && t <= endMs;
}

export function isEventUpcoming(event: AppEvent, now = new Date(), withinDays = 14): boolean {
  if (event.status === 'closed') return false;
  const { startMs } = eventWindowMs(event);
  const t = now.getTime();
  if (startMs >= t) return startMs - t <= withinDays * 86400000;
  return isEventLiveNow(event, now);
}

export function isEventPast(event: AppEvent, now = new Date()): boolean {
  const { endMs } = eventWindowMs(event);
  return now.getTime() > endMs;
}

export function isEventRelevantForPulse(event: AppEvent, now = new Date()): boolean {
  if (event.status === 'closed') return false;
  if (isEventPast(event, now)) return false;
  return isEventUpcoming(event, now, 14);
}

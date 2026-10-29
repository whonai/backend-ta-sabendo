import { purgeExpiredEphemeralEvents } from './ephemeralEventPurge';

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startEphemeralEventPurgeScheduler(): void {
  const minutes = Number(process.env.EPHEMERAL_PURGE_INTERVAL_MINUTES || '15');
  const intervalMs = Math.max(5, minutes) * 60 * 1000;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await purgeExpiredEphemeralEvents(new Date());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ephemeral] Purge tick failed', err);
    } finally {
      running = false;
    }
  };

  void tick();
  timer = setInterval(() => void tick(), intervalMs);
  // eslint-disable-next-line no-console
  console.log(`[ephemeral] Purge scheduler every ${minutes} min (start+3h rule, excludes curated)`);
}

export function stopEphemeralEventPurgeScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

import { connectDb } from '../../db';
import { InstagramCollectorService } from './InstagramCollectorService';

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startInstagramCollectorScheduler(): void {
  const enabled = (process.env.ENABLE_INSTAGRAM_COLLECTOR || 'false').toLowerCase() === 'true';
  if (!enabled) {
    return;
  }

  const minutes = Number(process.env.INSTAGRAM_COLLECTION_INTERVAL_MINUTES || '120');
  const intervalMs = Math.max(5, minutes) * 60 * 1000;

  const tick = async () => {
    if (running) {
      // eslint-disable-next-line no-console
      console.log('[Instagram] Previous collection still running, skipping tick');
      return;
    }
    running = true;
    try {
      await connectDb();
      const collector = InstagramCollectorService.createDefault();
      await collector.runCollectionCycle();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Instagram] Collection cycle failed', err);
    } finally {
      running = false;
    }
  };

  void tick();
  timer = setInterval(() => void tick(), intervalMs);
  // eslint-disable-next-line no-console
  console.log(`[Instagram] Scheduler enabled (every ${minutes} min)`);
}

export function stopInstagramCollectorScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

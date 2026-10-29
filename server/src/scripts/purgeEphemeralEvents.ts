import { connectDb } from '../db';
import { purgeExpiredEphemeralEvents } from '../services/ephemeralEventPurge';

async function main(): Promise<void> {
  await connectDb();
  const purged = await purgeExpiredEphemeralEvents(new Date());
  // eslint-disable-next-line no-console
  console.log(`Purged ${purged.length} ephemeral event(s).`);
  process.exit(0);
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

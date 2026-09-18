import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDb } from '../db';
import { InstagramCollectorService } from '../services/instagram/InstagramCollectorService';

async function main(): Promise<void> {
  await connectDb();
  const collector = InstagramCollectorService.createDefault();
  await collector.runCollectionCycle();
  process.exit(0);
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

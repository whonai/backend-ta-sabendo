import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, buf);
}

export async function hashFile(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

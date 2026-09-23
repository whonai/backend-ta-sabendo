import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  InstagramAdapter,
  InstagramPostItem,
  InstagramProfileInfo,
  InstagramSearchUserItem,
  InstagramStoryItem,
} from '../types';

type CliResponse<T> = { ok: true; data: T } | { ok: false; error: string };

function pythonScriptPath(): string {
  const candidates = [
    path.join(process.cwd(), 'python', 'instagram_cli.py'),
    path.join(__dirname, '..', '..', '..', 'python', 'instagram_cli.py'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

function pythonExecutable(): string {
  const venvPython = path.join(process.cwd(), 'python', '.venv', 'bin', 'python3');
  if (fs.existsSync(venvPython)) return venvPython;
  const fromDist = path.join(__dirname, '..', '..', '..', 'python', '.venv', 'bin', 'python3');
  if (fs.existsSync(fromDist)) return fromDist;
  return 'python3';
}

function sslEnv(): Record<string, string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const certifi = require('certifi') as string | { where?: () => string };
    const bundle = typeof certifi === 'string' ? certifi : certifi.where?.();
    if (bundle) {
      return { SSL_CERT_FILE: bundle, REQUESTS_CA_BUNDLE: bundle, CURL_CA_BUNDLE: bundle };
    }
  } catch {
    /* certifi optional on node side; python has its own */
  }
  return {};
}

function runPython<T>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    const script = pythonScriptPath();
    const py = pythonExecutable();
    // eslint-disable-next-line no-console
    console.log(`[Instagram] instagram_cli via ${py}`);
    const child = spawn(py, [script], {
      env: {
        ...process.env,
        ...sslEnv(),
        INSTAGRAM_USERNAME: process.env.INSTAGRAM_USERNAME || '',
        INSTAGRAM_PASSWORD: process.env.INSTAGRAM_PASSWORD || '',
        INSTAGRAM_SESSION_PATH: process.env.INSTAGRAM_SESSION_PATH || '',
        INSTAGRAM_SESSIONID: process.env.INSTAGRAM_SESSIONID || '',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      for (const line of text.split('\n').filter(Boolean)) {
        // eslint-disable-next-line no-console
        console.log(line.startsWith('[instagram_cli]') ? `[Instagram] ${line}` : `[Instagram][cli] ${line}`);
      }
    });
    child.on('error', err => reject(err));
    child.on('close', code => {
      const out = stdout.trim();
      if (out) {
        try {
          const parsed = JSON.parse(out) as CliResponse<T>;
          if (!parsed.ok) {
            reject(new Error(parsed.error || 'instagram_cli error'));
            return;
          }
          if (code === 0) {
            resolve(parsed.data);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() || out.slice(0, 300) || `instagram_cli exited with ${code}`
          )
        );
        return;
      }
      reject(new Error(`Invalid instagram_cli output: ${out.slice(0, 200)}`));
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

/** Implementação via Instagrapi (Python), isolada atrás de InstagramAdapter. */
export class InstagrapiInstagramAdapter implements InstagramAdapter {
  async getProfile(username: string): Promise<InstagramProfileInfo> {
    return runPython<InstagramProfileInfo>({ action: 'get_profile', username });
  }

  async getStories(username: string): Promise<InstagramStoryItem[]> {
    return runPython<InstagramStoryItem[]>({ action: 'get_stories', username });
  }

  async getPosts(username: string, limit = 12): Promise<InstagramPostItem[]> {
    return runPython<InstagramPostItem[]>({ action: 'get_posts', username, limit });
  }

  async searchUsers(query: string, limit = 5): Promise<InstagramSearchUserItem[]> {
    return runPython<InstagramSearchUserItem[]>({ action: 'search_users', query, limit });
  }
}

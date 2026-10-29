import crypto from 'crypto';

const STATE_SECRET = process.env.JWT_SECRET || 'ta-rolando-dev-secret-change-me';

function b64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

/** State assinado para proteção CSRF no fluxo OAuth (TTL 10 min). */
export function signOAuthState(): string {
  const payload = {
    n: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string): boolean {
  const parts = state.split('.');
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', STATE_SECRET).update(body).digest('base64url');
  if (sig !== expected) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { exp: number };
    return typeof payload.exp === 'number' && payload.exp >= Date.now();
  } catch {
    return false;
  }
}

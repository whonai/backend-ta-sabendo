import crypto from 'crypto';
import { AuthUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'ta-rolando-dev-secret-change-me';

function b64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

export function signToken(userId: string, ttlMs = 7 * 24 * 60 * 60 * 1000): string {
  const payload = {
    sub: userId,
    exp: Date.now() + ttlMs,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      sub: string;
      exp: number;
    };
    if (!payload.sub || payload.exp < Date.now()) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored || stored === 'undefined') return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const attemptBuf = Buffer.from(attempt, 'hex');
    if (hashBuf.length !== attemptBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, attemptBuf);
  } catch {
    return false;
  }
}

export function toAuthUser(doc: {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  role?: 'admin' | 'user';
  reputationLevel?: AuthUser['reputationLevel'];
  trustworthinessScore?: number;
}): AuthUser {
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    avatarUrl: doc.avatarUrl,
    isAdmin: doc.isAdmin,
    role: doc.role,
    reputationLevel: doc.reputationLevel,
    trustworthinessScore: doc.trustworthinessScore,
  };
}

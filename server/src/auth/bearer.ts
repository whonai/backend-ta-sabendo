import { Request } from 'express';
import { verifyToken } from './token';

export function bearerUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7).trim());
}

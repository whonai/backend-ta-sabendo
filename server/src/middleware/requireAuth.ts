import { Request, Response, NextFunction } from 'express';
import { bearerUserId } from '../routes/auth';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = bearerUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Faça login para esta ação' });
    return;
  }
  (req as Request & { userId: string }).userId = userId;
  next();
}

export function getRequestUserId(req: Request): string | null {
  return bearerUserId(req) || (req as Request & { userId?: string }).userId || null;
}

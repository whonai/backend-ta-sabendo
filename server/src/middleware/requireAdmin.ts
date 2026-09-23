import { Request, Response, NextFunction } from 'express';
import UserModel from '../models/user';
import { bearerUserId } from '../routes/auth';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = bearerUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Não autorizado' });
      return;
    }
    const user = await UserModel.findOne({ id: userId }).lean();
    if (!user?.isAdmin) {
      res.status(403).json({ message: 'Acesso restrito a administradores' });
      return;
    }
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message: 'Erro ao validar admin', error: message });
  }
}

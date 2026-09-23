import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import UserModel from '../models/user';
import {
  hashPassword,
  signToken,
  toAuthUser,
  verifyPassword,
  verifyToken,
} from '../auth/token';
import { AuthUser, ReputationLevel } from '../types';

const router = Router();

function bearerUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7).trim());
}

router.get('/me', async (req, res) => {
  const userId = bearerUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Token ausente ou inválido' });
  }

  const doc = await UserModel.findOne({ id: userId }).lean();
  if (!doc) return res.status(401).json({ message: 'Usuário não encontrado' });

  res.json(toAuthUser(doc as AuthUser & { passwordHash?: string }));
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email e password são obrigatórios' });
    }

    const doc = await UserModel.findOne({ email: String(email).toLowerCase() }).lean();
    if (!doc || !verifyPassword(String(password), String(doc.passwordHash || ''))) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const user = toAuthUser(doc as AuthUser & { passwordHash?: string });
    const token = signToken(String(doc.id));
    res.json({ user, token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[auth] POST /login', err);
    const isMongo =
      message.includes('MongoServerSelectionError') ||
      message.includes('connect ECONNREFUSED') ||
      message.includes('timed out');
    res.status(isMongo ? 503 : 500).json({
      message: isMongo ? 'Banco de dados indisponível' : 'Erro ao fazer login',
      error: message,
    });
  }
});

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'email e password são obrigatórios' });
  }

  const normalizedEmail = String(email).toLowerCase();
  const existing = await UserModel.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: 'E-mail já cadastrado' });
  }

  const id = `usr_${uuidv4().slice(0, 8)}`;
  const userDoc = {
    id,
    email: normalizedEmail,
    passwordHash: hashPassword(String(password)),
    name: name || normalizedEmail.split('@')[0],
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    isAdmin: false,
    role: 'user' as const,
    reputationLevel: 'Novo' as ReputationLevel,
    trustworthinessScore: 50,
  };

  await UserModel.create(userDoc);
  const user = toAuthUser(userDoc as AuthUser & { passwordHash: string });
  const token = signToken(id);
  res.status(201).json({ user, token });
});

export { bearerUserId };
export default router;

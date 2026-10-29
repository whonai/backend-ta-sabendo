import { Router, Response } from 'express';
import {
  exchangeGoogleCode,
  getGoogleAuthUrl,
  getGoogleRedirectUri,
  isGoogleOAuthConfigured,
  verifyGoogleIdToken,
} from '../auth/googleOAuth';
import { signOAuthState, verifyOAuthState } from '../auth/oauthState';
import { signToken, toAuthUser } from '../auth/token';
import { bearerUserId } from '../auth/bearer';
import {
  findOrCreateGoogleUser,
  findUserById,
  loginLocalUser,
  registerLocalUser,
} from '../auth/userService';
import { normalizeEmail, validateName, validatePassword } from '../auth/validation';

const router = Router();

function frontendCallbackBase(): string {
  const explicit = process.env.AUTH_FRONTEND_CALLBACK_URL?.trim();
  if (explicit) return explicit;
  const frontend = process.env.FRONTEND_URL?.trim();
  if (frontend) return `${frontend.replace(/\/$/, '')}/auth/callback`;
  return 'http://localhost:3000/auth/callback';
}

function redirectOAuthError(res: Response, code: string, message: string): void {
  const url = new URL(frontendCallbackBase());
  url.searchParams.set('error', code);
  url.searchParams.set('message', message);
  res.redirect(url.toString());
}

function isMongoUnavailable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('MongoServerSelectionError') ||
    message.includes('connect ECONNREFUSED') ||
    message.includes('timed out')
  );
}

router.get('/me', async (req, res) => {
  const userId = bearerUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Token ausente ou inválido' });
  }

  const doc = await findUserById(userId);
  if (!doc) return res.status(401).json({ message: 'Usuário não encontrado' });

  res.json(toAuthUser(doc));
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = validatePassword(req.body?.password);
    if (!email || !password) {
      return res.status(400).json({
        message: !email && req.body?.email
          ? 'E-mail inválido'
          : 'email e password são obrigatórios (senha mín. 6 caracteres)',
      });
    }

    const result = await loginLocalUser(email, password);
    if (!result) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = signToken(result.userId);
    res.json({ user: result.user, token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[auth] POST /login', err);
    res.status(isMongoUnavailable(err) ? 503 : 500).json({
      message: isMongoUnavailable(err) ? 'Banco de dados indisponível' : 'Erro ao fazer login',
      error: message,
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = validatePassword(req.body?.password);
    if (!email || !password) {
      return res.status(400).json({
        message: !email && req.body?.email
          ? 'E-mail inválido'
          : 'email e password são obrigatórios (senha mín. 6 caracteres)',
      });
    }

    const name = validateName(req.body?.name, email);
    const { user, userId } = await registerLocalUser({ email, password, name });
    const token = signToken(userId);
    res.status(201).json({ user, token });
  } catch (err: unknown) {
    const status = (err as Error & { status?: number }).status;
    if (status === 409) {
      return res.status(409).json({ message: 'E-mail já cadastrado' });
    }
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[auth] POST /register', err);
    res.status(isMongoUnavailable(err) ? 503 : 500).json({
      message: isMongoUnavailable(err) ? 'Banco de dados indisponível' : 'Erro ao cadastrar',
      error: message,
    });
  }
});

router.post('/logout', (_req, res) => {
  /** JWT stateless: o cliente descarta o token; endpoint para simetria com o frontend. */
  res.json({ ok: true });
});

router.get('/google', (_req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({
      message: 'Login com Google não configurado (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
      hint:
        'Preencha GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET em server/.env e reinicie o backend.',
      googleCloud: 'https://console.cloud.google.com/apis/credentials',
      redirectUriForGoogleConsole: getGoogleRedirectUri(),
    });
  }
  try {
    const state = signOAuthState();
    res.redirect(getGoogleAuthUrl(state));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message: 'Erro ao iniciar login Google', error: message });
  }
});

router.get('/google/callback', async (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return redirectOAuthError(res, 'not_configured', 'Login com Google indisponível');
  }

  const oauthError = typeof req.query.error === 'string' ? req.query.error : null;
  if (oauthError) {
    return redirectOAuthError(
      res,
      oauthError,
      typeof req.query.error_description === 'string'
        ? req.query.error_description
        : 'Autenticação cancelada'
    );
  }

  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code || !verifyOAuthState(state)) {
    return redirectOAuthError(res, 'invalid_state', 'State OAuth inválido ou expirado');
  }

  try {
    const { idToken } = await exchangeGoogleCode(code);
    const profile = await verifyGoogleIdToken(idToken);
    const { user, userId } = await findOrCreateGoogleUser(profile);
    const token = signToken(userId);

    const url = new URL(frontendCallbackBase());
    url.searchParams.set('token', token);
    res.redirect(url.toString());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[auth] GET /google/callback', err);
    redirectOAuthError(res, 'auth_failed', message);
  }
});

export default router;

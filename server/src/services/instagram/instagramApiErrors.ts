import { Response } from 'express';

export type InstagramErrorBody = {
  message: string;
  code: string;
  detail?: string;
};

function rawMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function formatInstagramHttpError(err: unknown): {
  status: number;
  message: string;
  code: string;
  detail?: string;
} {
  const raw = rawMessage(err);
  let igCode: string | undefined;

  try {
    const parsed = JSON.parse(raw) as { message?: string };
    if (parsed.message) igCode = parsed.message;
  } catch {
    if (raw.includes('user_has_logged_out')) igCode = 'user_has_logged_out';
  }

  const showDetail =
    process.env.INSTAGRAM_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

  const sessionDead =
    igCode === 'user_has_logged_out' ||
    raw.includes('user_has_logged_out') ||
    raw.includes('login_required') ||
    raw.includes('challenge_required');

  if (sessionDead) {
    return {
      status: 401,
      code: 'instagram_session_expired',
      message:
        'Sessão do Instagram expirou. Faça login no navegador, copie o cookie sessionid, atualize INSTAGRAM_SESSIONID no server/.env, apague data/instagram-session.json e reinicie o servidor.',
      detail: showDetail ? raw : undefined,
    };
  }

  if (raw.includes('INSTAGRAM_USERNAME/PASSWORD') || raw.includes('INSTAGRAM_SESSION')) {
    return {
      status: 503,
      code: 'instagram_not_configured',
      message: 'Instagram não configurado no servidor (INSTAGRAM_SESSIONID ou sessão em server/.env).',
      detail: showDetail ? raw : undefined,
    };
  }

  if (raw.includes('instagram_cli') || raw.includes('instagrapi') || raw.includes('unexpected keyword')) {
    return {
      status: 502,
      code: 'instagram_upstream_error',
      message: 'Não foi possível consultar o Instagram agora. Tente novamente; se continuar, renove o sessionid.',
      detail: showDetail ? raw : undefined,
    };
  }

  if (raw.includes('Venue não encontrado')) {
    return {
      status: 404,
      code: 'venue_not_found',
      message: 'Estabelecimento não encontrado.',
      detail: showDetail ? raw : undefined,
    };
  }

  return {
    status: 500,
    code: igCode || 'instagram_error',
    message: 'Erro ao comunicar com o Instagram.',
    detail: showDetail ? raw : undefined,
  };
}

/** Resposta JSON padronizada para rotas que usam Instagrapi. */
export function writeInstagramError(res: Response, err: unknown): void {
  const mapped = formatInstagramHttpError(err);
  const body: InstagramErrorBody = {
    message: mapped.message,
    code: mapped.code,
  };
  if (mapped.detail) body.detail = mapped.detail;
  res.status(mapped.status).json(body);
}

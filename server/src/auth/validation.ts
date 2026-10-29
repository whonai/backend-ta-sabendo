const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string' || !email.trim()) return null;
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return null;
  return normalized;
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 6) return null;
  return password;
}

export function validateName(name: unknown, fallbackEmail: string): string {
  if (typeof name === 'string' && name.trim()) return name.trim().slice(0, 120);
  return fallbackEmail.split('@')[0];
}

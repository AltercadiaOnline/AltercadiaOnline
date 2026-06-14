import type { AuthUser } from '../../shared/authService.js';

const SESSION_KEY = 'altercadia.local.session';

export type LocalSession = AuthUser & {
  id: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function resolveAccountKey(user: AuthUser): string {
  if (user.id && user.id.length > 0) return user.id;
  return `email:${normalizeEmail(user.email)}`;
}

export function setLocalSession(user: AuthUser): LocalSession {
  const session: LocalSession = {
    id: resolveAccountKey(user),
    email: normalizeEmail(user.email),
    ...(user.fullName ? { fullName: user.fullName } : {}),
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getLocalSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;

    const record = parsed as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.email !== 'string') return null;

    return {
      id: record.id,
      email: record.email,
      ...(typeof record.fullName === 'string' ? { fullName: record.fullName } : {}),
    };
  } catch {
    return null;
  }
}

export function clearLocalSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

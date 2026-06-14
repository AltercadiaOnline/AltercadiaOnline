import { loginLocalUser, registerLocalUser } from '../services/localAuthStore.js';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Hostnames onde o login local pode auto-criar conta (sem Supabase). */
export function isLocalDevHost(hostname = window.location.hostname): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Login offline: tenta credenciais salvas; em localhost cria conta local na primeira entrada.
 */
export async function loginLocalDevAccount(
  email: string,
  password: string,
): Promise<ReturnType<typeof loginLocalUser>> {
  const existing = loginLocalUser(email, password);
  if (existing.ok) return existing;

  if (!isLocalDevHost()) {
    return existing;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return { ok: false, message: 'Preencha email e senha.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
  }

  const displayName = normalizedEmail.split('@')[0] || 'Operador';
  const registered = registerLocalUser({
    email: normalizedEmail,
    password,
    fullName: displayName,
    birthDate: '2000-01-01',
  });

  if (!registered.ok && !registered.message.includes('já está cadastrado')) {
    return { ok: false, message: registered.message };
  }

  return loginLocalUser(email, password);
}

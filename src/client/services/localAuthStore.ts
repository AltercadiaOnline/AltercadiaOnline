const STORAGE_KEY = 'altercadia.local.users';

type LocalUserRecord = {
  id: string;
  email: string;
  password: string;
};

export type LocalAuthResult = {
  ok: boolean;
  message: string;
};

export type LocalLoginResult = LocalAuthResult & {
  user?: { email: string; id: string };
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is LocalUserRecord =>
        typeof entry === 'object'
        && entry !== null
        && typeof (entry as LocalUserRecord).id === 'string'
        && typeof (entry as LocalUserRecord).email === 'string'
        && typeof (entry as LocalUserRecord).password === 'string',
    );
  } catch {
    return [];
  }
}

function writeUsers(users: LocalUserRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function registerLocalUser(email: string, password: string): LocalAuthResult {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return { ok: false, message: 'Preencha email e senha.' };
  }

  if (!normalizedEmail.includes('@')) {
    return { ok: false, message: 'Informe um email válido.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
  }

  const users = readUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    return { ok: false, message: 'Este email já está cadastrado.' };
  }

  users.push({
    id: crypto.randomUUID(),
    email: normalizedEmail,
    password,
  });
  writeUsers(users);

  return { ok: true, message: 'Conta criada! Use LOGIN para entrar.' };
}

export function loginLocalUser(email: string, password: string): LocalLoginResult {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return { ok: false, message: 'Preencha email e senha.' };
  }

  const user = readUsers().find(
    (entry) => entry.email === normalizedEmail && entry.password === password,
  );

  if (!user) {
    return { ok: false, message: 'Email ou senha incorretos.' };
  }

  return {
    ok: true,
    message: 'Login autorizado.',
    user: { email: user.email, id: user.id },
  };
}

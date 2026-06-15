export type DatabaseEnv = {
  /** Connection string completa — tem prioridade sobre host/user/password. */
  readonly url: string | null;
  readonly host: string | null;
  readonly port: number | null;
  readonly user: string | null;
  readonly password: string | null;
  readonly name: string | null;
};

function parseDatabasePort(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const port = Number(raw);
  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
  return port;
}

/** Lê credenciais Postgres/Supabase DB a partir de `process.env`. */
export function loadDatabaseEnv(env: NodeJS.ProcessEnv = process.env): DatabaseEnv {
  const url =
    env.DATABASE_URL?.trim()
    || env.SUPABASE_DATABASE_URL?.trim()
    || env.POSTGRES_URL?.trim()
    || null;

  return {
    url,
    host: env.DATABASE_HOST?.trim() || null,
    port: parseDatabasePort(env.DATABASE_PORT),
    user: env.DATABASE_USER?.trim() || null,
    password: env.DATABASE_PASSWORD?.trim() || null,
    name: env.DATABASE_NAME?.trim() || null,
  };
}

/** Monta URL Postgres quando credenciais parciais estão definidas. */
export function resolveDatabaseConnectionString(database: DatabaseEnv): string | null {
  if (database.url) return database.url;

  const { host, user, password, name } = database;
  if (!host || !user || !password || !name) return null;

  const port = database.port ?? 5432;
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const encodedName = encodeURIComponent(name);

  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedName}`;
}

export function isDatabaseConfigured(database: DatabaseEnv): boolean {
  return resolveDatabaseConnectionString(database) !== null;
}

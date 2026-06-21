/** Arquivo legado opcional — prefira um único `.env` (ver `.env.example`). */
export const GOVERNANCE_ENV_FILENAME = '.env.governance';

export const LOCAL_ENV_FILENAME = '.env';

/** Chaves sensíveis Supabase + Postgres (vivem no `.env` local ou no shell de produção). */
export const GOVERNANCE_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'SUPABASE_DATABASE_URL',
  'POSTGRES_URL',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
] as const;

export type GovernanceEnvKey = (typeof GOVERNANCE_ENV_KEYS)[number];

const governanceKeySet = new Set<string>(GOVERNANCE_ENV_KEYS);

export function isGovernanceEnvKey(key: string): key is GovernanceEnvKey {
  return governanceKeySet.has(key);
}

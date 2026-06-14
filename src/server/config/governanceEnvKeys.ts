/** Chaves oficiais de credenciais Supabase + Postgres — fonte: `.env.governance`. */
export const GOVERNANCE_ENV_FILENAME = '.env.governance';

export const LOCAL_ENV_FILENAME = '.env';

/** Ordem de prioridade global: shell/Vercel > `.env.governance` > `.env` (só chaves de governance). */
export const GOVERNANCE_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
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

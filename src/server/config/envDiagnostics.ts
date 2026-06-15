import { GOVERNANCE_ENV_KEYS } from './governanceEnvKeys.js';

/** Mascara segredo para logs — nunca logar chaves completas. */
export function maskEnvSecret(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '(ausente)';
  if (trimmed.length <= 8) return `**** (${trimmed.length} chars)`;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)} (${trimmed.length} chars)`;
}

export function describeEnvKeyPresence(
  env: NodeJS.ProcessEnv,
  key: string,
): { readonly present: boolean; readonly preview: string; readonly source: 'system' | 'missing' } {
  const raw = env[key];
  const present = Boolean(raw?.trim());
  return {
    present,
    preview: maskEnvSecret(raw),
    source: present ? 'system' : 'missing',
  };
}

export function logGovernanceEnvStatus(env: NodeJS.ProcessEnv = process.env): void {
  console.log('[env] Variáveis de governança (Supabase + Postgres):');
  for (const key of GOVERNANCE_ENV_KEYS) {
    const status = describeEnvKeyPresence(env, key);
    console.log(`  ${key} → ${status.present ? 'definida' : 'ausente'} ${status.preview}`);
  }
}

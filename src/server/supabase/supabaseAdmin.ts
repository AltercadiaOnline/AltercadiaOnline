import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServerEnv } from '../config/env.js';
import {
  normalizeSupabaseProjectUrl,
  sanitizeEnvSecret,
  validateSupabaseProjectUrl,
} from './normalizeSupabaseUrl.js';

let adminClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

export type SupabaseAdminCredentials = {
  readonly url: string;
  readonly serviceRoleKey: string;
};

export function isSupabaseAdminConfigured(env: ServerEnv): boolean {
  return resolveSupabaseAdminCredentials(env) !== null;
}

/** Resolve URL + service_role já normalizados — null se inválidos. */
export function resolveSupabaseAdminCredentials(env: ServerEnv): SupabaseAdminCredentials | null {
  const url = normalizeSupabaseProjectUrl(env.supabaseUrl ?? process.env.SUPABASE_URL);
  const serviceRoleKey = sanitizeEnvSecret(
    env.supabaseServiceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

/** Falha imediata se URL ou service_role estiverem ausentes/inválidos (servidor online-first). */
export function assertSupabaseAdminEnv(env: ServerEnv): SupabaseAdminCredentials {
  const credentials = resolveSupabaseAdminCredentials(env);
  if (!credentials) {
    const rawUrl = env.supabaseUrl ?? process.env.SUPABASE_URL ?? '';
    const hasUrl = Boolean(rawUrl.trim());
    const hasKey = Boolean(
      (env.supabaseServiceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim(),
    );

    if (!hasUrl) {
      throw new Error(
        '[Supabase] SUPABASE_URL é obrigatório — defina no Railway, Vercel ou .env.governance.',
      );
    }
    if (!hasKey) {
      throw new Error(
        '[Supabase] SUPABASE_SERVICE_ROLE_KEY é obrigatório — o servidor não inicia sem cliente admin.',
      );
    }

    throw new Error(
      '[Supabase] SUPABASE_URL inválida — use https://SEU_PROJETO.supabase.co '
      + '(sem aspas, sem /rest/v1, com https://).',
    );
  }

  assertSupabaseProjectUrlShape(credentials);
  return credentials;
}

function assertSupabaseProjectUrlShape(credentials: SupabaseAdminCredentials): void {
  const validation = validateSupabaseProjectUrl(credentials.url);
  if (!validation.ok) {
    throw new Error(`[Supabase] ${validation.reason}`);
  }
}

/** Cliente admin (service_role) — bootstrap e leitura autoritativa; nunca expor ao browser. */
export async function getSupabaseAdminClient(env: ServerEnv): Promise<SupabaseClient> {
  const credentials = assertSupabaseAdminEnv(env);

  if (adminClient) return adminClient;

  if (!initPromise) {
    initPromise = (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      try {
        adminClient = createClient(credentials.url, credentials.serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        return adminClient;
      } catch (error) {
        initPromise = null;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`[Supabase] Falha ao instanciar cliente admin: ${message}`);
      }
    })();
  }

  return initPromise;
}

export function resetSupabaseAdminClientForTests(): void {
  adminClient = null;
  initPromise = null;
}

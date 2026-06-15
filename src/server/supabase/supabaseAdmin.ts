import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServerEnv } from '../config/env.js';

let adminClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

export function isSupabaseAdminConfigured(env: ServerEnv): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

/** Cliente admin (service_role) — bootstrap e leitura autoritativa; nunca expor ao browser.
 * Chave lida de `.env.governance` / Vercel (`SUPABASE_SERVICE_ROLE_KEY`). */
export async function getSupabaseAdminClient(env: ServerEnv): Promise<SupabaseClient | null> {
  if (!isSupabaseAdminConfigured(env)) return null;

  if (adminClient) return adminClient;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        adminClient = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        return adminClient;
      } catch (error) {
        initPromise = null;
        console.error('[Supabase] Erro ao criar cliente admin:', {
          message: error instanceof Error ? error.message : String(error),
          urlPresent: Boolean(env.supabaseUrl),
          serviceRolePresent: Boolean(env.supabaseServiceRoleKey),
        });
        return null;
      }
    })();
  }

  return initPromise;
}

export function resetSupabaseAdminClientForTests(): void {
  adminClient = null;
  initPromise = null;
}

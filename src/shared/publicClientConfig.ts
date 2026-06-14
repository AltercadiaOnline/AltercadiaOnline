/** Config pública exposta ao browser (sem segredos de serviço).
 * Valores vêm de `.env.governance` → `loadProjectEnv()` → `createPublicClientConfig()` → GET `/config/client`.
 * Apenas `SUPABASE_URL` + `SUPABASE_ANON_KEY` — nunca `SUPABASE_SERVICE_ROLE_KEY`. */
export type PublicClientConfig = {
  readonly supabaseUrl: string | null;
  readonly supabaseAnonKey: string | null;
};

export function createPublicClientConfig(env: {
  readonly supabaseUrl?: string;
  readonly supabaseAnonKey?: string;
}): PublicClientConfig {
  const supabaseUrl = env.supabaseUrl?.trim() || null;
  const supabaseAnonKey = env.supabaseAnonKey?.trim() || null;
  return { supabaseUrl, supabaseAnonKey };
}

export function isSupabaseConfigured(config: PublicClientConfig): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

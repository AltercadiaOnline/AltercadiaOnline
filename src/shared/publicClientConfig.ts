/** Config pública exposta ao browser (sem segredos de serviço).
 * Valores vêm de `.env.governance` → `loadProjectEnv()` → `createPublicClientConfig()` → GET `/config/client`.
 * Apenas `SUPABASE_URL` + `SUPABASE_ANON_KEY` — nunca `SUPABASE_SERVICE_ROLE_KEY`. */
export type PublicClientConfig = {
  readonly supabaseUrl: string | null;
  readonly supabaseAnonKey: string | null;
  /** WebSocket do jogo — obrigatório quando o front está na Vercel e o servidor no Railway. */
  readonly gameWsUrl: string | null;
  /** HTTP do servidor de jogo (Railway) — APIs /health, /api/*. Deriva de gameWsUrl se omitido. */
  readonly gameHttpUrl: string | null;
  /** Shard ativo deste deploy — deve coincidir com SERVER_ID do Railway. */
  readonly serverId: string;
  readonly serverName: string;
};

export function createPublicClientConfig(env: {
  readonly supabaseUrl?: string;
  readonly supabaseAnonKey?: string;
  readonly gameWsUrl?: string;
  readonly gameHttpUrl?: string;
  readonly serverId?: string;
  readonly serverName?: string;
}): PublicClientConfig {
  const supabaseUrl = env.supabaseUrl?.trim() || null;
  const supabaseAnonKey = env.supabaseAnonKey?.trim() || null;
  const gameWsUrl = env.gameWsUrl?.trim() || null;
  const gameHttpUrl = env.gameHttpUrl?.trim() || null;
  const serverId = env.serverId?.trim().toLowerCase() || 'default';
  const serverName = env.serverName?.trim() || serverId;
  return { supabaseUrl, supabaseAnonKey, gameWsUrl, gameHttpUrl, serverId, serverName };
}

export function isSupabaseConfigured(config: PublicClientConfig): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

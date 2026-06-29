import type { DatabaseEnv } from './databaseConfig.js';
import { loadDatabaseEnv } from './databaseConfig.js';
import { BUILTIN_ALLOWED_ORIGINS } from './cors.js';
import {
  normalizeGameHttpUrl,
  normalizeGameWsUrl,
  normalizeSupabaseProjectUrl,
  sanitizeEnvSecret,
  deriveGameHttpUrlFromWs,
} from '../supabase/normalizeSupabaseUrl.js';
import { normalizePublicSiteOrigin } from '../../shared/auth/authRedirectOrigin.js';
import type { ServerInstanceDefinition } from '../../shared/world/serverInstanceCatalog.js';
import { resolveServerInstanceFromEnv } from './serverInstanceEnv.js';

export type NodeEnv = 'development' | 'production' | 'test';
export type ServerEnv = {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly host: string;
  readonly corsOrigins: readonly string[];
  readonly trustProxy: boolean;
  readonly supabaseUrl: string | null;
  readonly supabaseAnonKey: string | null;
  readonly supabaseServiceRoleKey: string | null;
  /** URL pública do WebSocket — exposta via GET /config/client (ex.: wss://app.railway.app/ws). */
  readonly gameWsUrl: string | null;
  /** URL HTTP do servidor de jogo — exposta via GET /config/client (ex.: https://app.railway.app). */
  readonly gameHttpUrl: string | null;
  /** URL pública do front (redirect email/OAuth). */
  readonly publicSiteUrl: string | null;
  /** Permite world-login sem JWT — apenas desenvolvimento local explícito. */
  readonly devAuthBypass: boolean;
  readonly database: DatabaseEnv;
  /** Shard / instância de mundo (SERVER_ID). */
  readonly serverInstance: ServerInstanceDefinition;
  /** Protege GET /ops/* — ausente em dev; obrigatório em produção. */
  readonly opsToken: string | null;
};

function parseNodeEnv(raw: string | undefined): NodeEnv {
  if (raw === 'production' || raw === 'test' || raw === 'development') return raw;
  return 'development';
}

function mergeUniqueOrigins(...lists: readonly (readonly string[])[]): readonly string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const list of lists) {
    for (const entry of list) {
      const normalized = entry.replace(/\/+$/, '');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        merged.push(normalized);
      }
    }
  }
  return merged;
}

function parseCorsOrigins(raw: string | undefined, nodeEnv: NodeEnv): readonly string[] {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '*') return ['*'];
  const fromEnv = trimmed
    ? trimmed.split(',').map((entry) => entry.trim()).filter(Boolean)
    : nodeEnv === 'production'
      ? []
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'];
  return mergeUniqueOrigins(BUILTIN_ALLOWED_ORIGINS, fromEnv);
}

function parseBooleanFlag(raw: string | undefined): boolean {
  return raw === '1' || raw === 'true';
}

/** Lê variáveis de ambiente para HTTP + WebSocket em nuvem. */
export function loadServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`PORT inválida: ${env.PORT ?? '(vazia)'}`);
  }

  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const serverInstance = resolveServerInstanceFromEnv(env, nodeEnv);
  const trustProxy =
    env.TRUST_PROXY === '1' ||
    env.TRUST_PROXY === 'true' ||
    (nodeEnv === 'production' && env.TRUST_PROXY !== 'false');

  const gameWsUrl = normalizeGameWsUrl(env.GAME_WS_URL ?? env.PUBLIC_GAME_WS_URL);
  const gameHttpUrl =
    normalizeGameHttpUrl(env.GAME_HTTP_URL ?? env.PUBLIC_GAME_HTTP_URL)
    ?? deriveGameHttpUrlFromWs(gameWsUrl);
  const publicSiteUrl = normalizePublicSiteOrigin(
    env.PUBLIC_SITE_URL ?? env.AUTH_REDIRECT_ORIGIN ?? env.VERCEL_PROJECT_PRODUCTION_URL,
  );
  const devAuthBypass = parseBooleanFlag(env.DEV_AUTH_BYPASS);

  if (nodeEnv === 'production' && devAuthBypass) {
    throw new Error(
      '[env] DEV_AUTH_BYPASS não pode estar ativo em produção. Remova a variável ou defina DEV_AUTH_BYPASS=false.',
    );
  }

  return {
    nodeEnv,
    port,
    host: env.HOST?.trim() || '0.0.0.0',
    corsOrigins: parseCorsOrigins(env.CORS_ORIGIN ?? env.CORS_ORIGINS, nodeEnv),
    trustProxy,
    supabaseUrl: normalizeSupabaseProjectUrl(env.SUPABASE_URL),
    supabaseAnonKey: sanitizeEnvSecret(env.SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: sanitizeEnvSecret(env.SUPABASE_SERVICE_ROLE_KEY),
    gameWsUrl,
    gameHttpUrl,
    publicSiteUrl,
    devAuthBypass,
    database: loadDatabaseEnv(env, serverInstance),
    serverInstance,
    opsToken: sanitizeEnvSecret(env.OPS_TOKEN),
  };
}

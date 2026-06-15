import type { DatabaseEnv } from './databaseConfig.js';
import { loadDatabaseEnv } from './databaseConfig.js';
import { BUILTIN_ALLOWED_ORIGINS } from './cors.js';

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
  /** Permite world-login sem JWT — apenas desenvolvimento local explícito. */
  readonly devAuthBypass: boolean;
  readonly database: DatabaseEnv;
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

/** Lê variáveis de ambiente para HTTP + WebSocket em nuvem. */
export function loadServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`PORT inválida: ${env.PORT ?? '(vazia)'}`);
  }

  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const trustProxy =
    env.TRUST_PROXY === '1' ||
    env.TRUST_PROXY === 'true' ||
    (nodeEnv === 'production' && env.TRUST_PROXY !== 'false');

  return {
    nodeEnv,
    port,
    host: env.HOST?.trim() || '0.0.0.0',
    corsOrigins: parseCorsOrigins(env.CORS_ORIGIN ?? env.CORS_ORIGINS, nodeEnv),
    trustProxy,
    supabaseUrl: env.SUPABASE_URL?.trim() || null,
    supabaseAnonKey: env.SUPABASE_ANON_KEY?.trim() || null,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
    gameWsUrl: env.GAME_WS_URL?.trim() || env.PUBLIC_GAME_WS_URL?.trim() || null,
    devAuthBypass:
      env.DEV_AUTH_BYPASS === '1'
      || env.DEV_AUTH_BYPASS === 'true'
      || (nodeEnv === 'development' && env.DEV_AUTH_BYPASS !== 'false'),
    database: loadDatabaseEnv(env),
  };
}

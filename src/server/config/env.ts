export type NodeEnv = 'development' | 'production' | 'test';

export type ServerEnv = {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly host: string;
  readonly corsOrigins: readonly string[];
  readonly trustProxy: boolean;
  readonly supabaseUrl: string | null;
  readonly supabaseAnonKey: string | null;
};

function parseNodeEnv(raw: string | undefined): NodeEnv {
  if (raw === 'production' || raw === 'test' || raw === 'development') return raw;
  return 'development';
}

function parseCorsOrigins(raw: string | undefined, nodeEnv: NodeEnv): readonly string[] {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    if (nodeEnv === 'production') return [];
    return ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'];
  }
  if (trimmed === '*') return ['*'];
  return trimmed.split(',').map((entry) => entry.trim()).filter(Boolean);
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
  };
}

import type { ServerEnv } from '../config/env.js';
import {
  isDatabaseConfigured,
  resolveDatabaseConnectionString,
} from '../config/databaseConfig.js';
import { describeEnvKeyPresence, maskEnvSecret } from '../config/envDiagnostics.js';
import { initPgPool, isPgPoolReady } from '../persistence/DatabaseUtils.js';
import {
  assertSupabaseAdminEnv,
  getSupabaseAdminClient,
  type SupabaseAdminCredentials,
} from './supabaseAdmin.js';
import {
  extractSupabaseProjectHost,
  validateSupabaseProjectUrl,
} from './normalizeSupabaseUrl.js';

export type SupabaseBootstrapReport = {
  readonly adminConfigured: true;
  readonly clientPublicConfigured: boolean;
  readonly adminClientCreated: true;
  readonly apiProbe: 'ok';
  readonly postgresConfigured: boolean;
  readonly postgresProbe: 'ok' | 'failed' | 'skipped';
  readonly postgresProbeError?: string;
};

const PROBE_ATTEMPTS = 3;
const PROBE_DELAY_MS = 2_000;

function logSupabaseEnvKeys(env: ServerEnv): void {
  const url = describeEnvKeyPresence(process.env, 'SUPABASE_URL');
  const anon = describeEnvKeyPresence(process.env, 'SUPABASE_ANON_KEY');
  const service = describeEnvKeyPresence(process.env, 'SUPABASE_SERVICE_ROLE_KEY');

  console.log('[Supabase] Diagnóstico de variáveis:');
  console.log(`  SUPABASE_URL              → ${url.present ? 'OK' : 'AUSENTE'} ${url.preview}`);
  console.log(`  SUPABASE_ANON_KEY         → ${anon.present ? 'OK' : 'AUSENTE'} ${anon.preview}`);
  console.log(
    `  SUPABASE_SERVICE_ROLE_KEY → ${service.present ? 'OK' : 'AUSENTE'} ${service.preview}`,
  );
}

function warnIfSupabaseUrlWasNormalized(credentials: SupabaseAdminCredentials): void {
  const raw = process.env.SUPABASE_URL?.trim() ?? '';
  if (!raw || raw.length <= credentials.url.length + 3) return;

  const host = extractSupabaseProjectHost(credentials.url) ?? credentials.url;
  console.warn(
    '[Supabase] SUPABASE_URL foi normalizada (path/query removidos). '
    + `Raw ${raw.length} chars → host "${host}". `
    + 'Use apenas https://SEU_REF.supabase.co no Railway.',
  );
}

function warnIfBrowserAuthKeysMissing(env: ServerEnv): void {
  if (!env.supabaseAnonKey?.trim()) {
    console.warn(
      '[Supabase] SUPABASE_ANON_KEY ausente — login no browser via /config/client ficará indisponível.',
    );
  }
}

function logPostgresEnvKeys(env: ServerEnv): void {
  const dbUrl = describeEnvKeyPresence(process.env, 'DATABASE_URL');
  const supabaseDbUrl = describeEnvKeyPresence(process.env, 'SUPABASE_DATABASE_URL');
  const postgresUrl = describeEnvKeyPresence(process.env, 'POSTGRES_URL');
  const dbHost = describeEnvKeyPresence(process.env, 'DATABASE_HOST');

  console.log('[Postgres] Diagnóstico (opcional — separado da API Supabase):');
  console.log(`  DATABASE_URL           → ${dbUrl.present ? 'OK' : 'ausente'} ${dbUrl.preview}`);
  console.log(`  SUPABASE_DATABASE_URL  → ${supabaseDbUrl.present ? 'OK' : 'ausente'} ${supabaseDbUrl.preview}`);
  console.log(`  POSTGRES_URL           → ${postgresUrl.present ? 'OK' : 'ausente'} ${postgresUrl.preview}`);
  console.log(`  DATABASE_HOST          → ${dbHost.present ? 'OK' : 'ausente'} ${dbHost.preview}`);

  if (!isDatabaseConfigured(env.database)) {
    console.log(
      '[Postgres] Não configurado — normal se usar só a API Supabase (service_role). '
      + 'Para PERSISTENCE_MODE=postgres, defina DATABASE_URL.',
    );
  }
}

function formatNetworkProbeFailure(
  credentials: SupabaseAdminCredentials,
  message: string,
  cause?: unknown,
): string {
  const host = extractSupabaseProjectHost(credentials.url) ?? credentials.url;
  const causeLine = cause instanceof Error && cause.message && cause.message !== message
    ? `\n  Causa: ${cause.message}`
    : '';

  return [
    `[Supabase] Não foi possível contactar a API REST em ${host}.`,
    `  Erro: ${message}${causeLine}`,
    '  Verifique no Railway:',
    '    • SUPABASE_URL = Project URL do dashboard (Settings → API), ex.: https://abcd1234.supabase.co',
    '    • Não use a URL do Railway/Vercel nem postgres:// como SUPABASE_URL',
    '    • Projeto Supabase ativo (não pausado) — dashboard → Restore project se necessário',
    '    • SUPABASE_SERVICE_ROLE_KEY do mesmo projeto que a URL',
  ].join('\n');
}

function isFetchFailureMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('fetch failed')
    || lower.includes('network')
    || lower.includes('econnrefused')
    || lower.includes('enotfound')
    || lower.includes('etimedout');
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function probeSupabaseApiOnce(credentials: SupabaseAdminCredentials): Promise<void> {
  const validation = validateSupabaseProjectUrl(credentials.url);
  if (!validation.ok) {
    throw new Error(`[Supabase] ${validation.reason}`);
  }

  const endpoint = `${credentials.url.replace(/\/+$/, '')}/rest/v1/profiles?select=id&limit=1`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: credentials.serviceRoleKey,
      Authorization: `Bearer ${credentials.serviceRoleKey}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (response.ok) return;

  const body = await response.text().catch(() => '');
  if (response.status === 404 || body.includes('does not exist') || body.includes('relation')) {
    throw new Error(
      '[Supabase] Tabela public.profiles não encontrada — aplique supabase/migrations/*.sql no projeto.',
    );
  }

  throw new Error(
    `[Supabase] Probe REST falhou (HTTP ${response.status}): ${body.slice(0, 240) || response.statusText}`,
  );
}

async function probeSupabaseApi(env: ServerEnv, credentials: SupabaseAdminCredentials): Promise<void> {
  const host = extractSupabaseProjectHost(credentials.url);
  console.log(`[Supabase] Probe REST → https://${host ?? '?'}/rest/v1/`);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= PROBE_ATTEMPTS; attempt += 1) {
    try {
      await probeSupabaseApiOnce(credentials);
      await getSupabaseAdminClient(env);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error.cause : undefined;
      const retryable = isFetchFailureMessage(message)
        || (cause instanceof Error && isFetchFailureMessage(cause.message));

      if (attempt < PROBE_ATTEMPTS && retryable) {
        console.warn(
          `[Supabase] Probe falhou (tentativa ${attempt}/${PROBE_ATTEMPTS}) — retry em ${PROBE_DELAY_MS}ms:`,
          message,
        );
        await sleep(PROBE_DELAY_MS);
        continue;
      }

      if (isFetchFailureMessage(message) || (cause instanceof Error && isFetchFailureMessage(cause.message))) {
        throw new Error(formatNetworkProbeFailure(credentials, message, cause));
      }

      throw error instanceof Error ? error : new Error(message);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(formatNetworkProbeFailure(credentials, String(lastError)));
}

async function probePostgresConnection(
  env: ServerEnv,
): Promise<Pick<SupabaseBootstrapReport, 'postgresProbe' | 'postgresProbeError'>> {
  if (!isDatabaseConfigured(env.database)) {
    return { postgresProbe: 'skipped' };
  }

  const connectionString = resolveDatabaseConnectionString(env.database);
  if (!connectionString) {
    return { postgresProbe: 'skipped' };
  }

  if (isPgPoolReady()) {
    return { postgresProbe: 'ok' };
  }

  try {
    await initPgPool(connectionString);
    console.log('[Postgres] Conexão direta OK (SELECT 1)');
    return { postgresProbe: 'ok' };
  } catch (error) {
    return {
      postgresProbe: 'failed',
      postgresProbeError: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Bootstrap obrigatório — falha fatal se variáveis ou probe da API Supabase falharem.
 * O processo deve encerrar (process.exit(1)) quando este método lançar.
 */
export async function bootstrapSupabase(env: ServerEnv): Promise<SupabaseBootstrapReport> {
  logSupabaseEnvKeys(env);
  const credentials = assertSupabaseAdminEnv(env);
  warnIfSupabaseUrlWasNormalized(credentials);
  warnIfBrowserAuthKeysMissing(env);
  logPostgresEnvKeys(env);

  console.log(
    `[Supabase] Cliente admin instanciado com sucesso — URL ${maskEnvSecret(credentials.url)}`,
  );

  await probeSupabaseApi(env, credentials);
  console.log('[Supabase] Conexão validada — tabela public.profiles respondeu com sucesso.');

  const pgResult = await probePostgresConnection(env);
  if (pgResult.postgresProbe === 'failed') {
    console.warn('[Postgres] Conexão direta falhou (opcional):', pgResult.postgresProbeError);
  }

  return {
    adminConfigured: true,
    clientPublicConfigured: Boolean(env.supabaseUrl && env.supabaseAnonKey),
    adminClientCreated: true,
    apiProbe: 'ok',
    postgresConfigured: isDatabaseConfigured(env.database),
    ...pgResult,
  };
}

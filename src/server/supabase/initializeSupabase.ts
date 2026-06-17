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
} from './supabaseAdmin.js';

export type SupabaseBootstrapReport = {
  readonly adminConfigured: true;
  readonly clientPublicConfigured: boolean;
  readonly adminClientCreated: true;
  readonly apiProbe: 'ok';
  readonly postgresConfigured: boolean;
  readonly postgresProbe: 'ok' | 'failed' | 'skipped';
  readonly postgresProbeError?: string;
};

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

async function probeSupabaseApi(env: ServerEnv): Promise<void> {
  const client = await getSupabaseAdminClient(env);

  const { error } = await client.from('profiles').select('id').limit(1);
  if (error) {
    const hint =
      error.message.includes('relation') || error.message.includes('does not exist')
        ? ' Aplique supabase/migrations/*.sql no projeto Supabase.'
        : '';
    throw new Error(
      `[Supabase] Falha ao validar conexão (public.profiles): ${error.code ?? 'error'}: ${error.message}.${hint}`,
    );
  }
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
  warnIfBrowserAuthKeysMissing(env);
  logPostgresEnvKeys(env);

  await getSupabaseAdminClient(env);
  console.log(
    `[Supabase] Cliente admin instanciado com sucesso — URL ${maskEnvSecret(credentials.url)}`,
  );

  await probeSupabaseApi(env);
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

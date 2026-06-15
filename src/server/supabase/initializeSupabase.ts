import type { ServerEnv } from '../config/env.js';
import {
  isDatabaseConfigured,
  resolveDatabaseConnectionString,
} from '../config/databaseConfig.js';
import { describeEnvKeyPresence, maskEnvSecret } from '../config/envDiagnostics.js';
import { initPgPool, isPgPoolReady } from '../persistence/DatabaseUtils.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from './supabaseAdmin.js';

export type SupabaseBootstrapReport = {
  readonly adminConfigured: boolean;
  readonly clientPublicConfigured: boolean;
  readonly adminClientCreated: boolean;
  readonly apiProbe: 'ok' | 'failed' | 'skipped';
  readonly apiProbeError?: string;
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

  if (!url.present || !service.present) {
    console.warn(
      '[Supabase] Cliente admin indisponível — defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no painel do Railway (Variables).',
    );
  }
  if (!url.present || !anon.present) {
    console.warn(
      '[Supabase] Login no browser indisponível — defina SUPABASE_URL e SUPABASE_ANON_KEY (expostas via GET /config/client).',
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
      + 'Para PERSISTENCE_MODE=postgres, defina DATABASE_URL (Supabase → Settings → Database → Connection string).',
    );
  }
}

async function probeSupabaseApi(env: ServerEnv): Promise<Pick<SupabaseBootstrapReport, 'apiProbe' | 'apiProbeError'>> {
  if (!isSupabaseAdminConfigured(env)) {
    return { apiProbe: 'skipped' };
  }

  const client = await getSupabaseAdminClient(env);
  if (!client) {
    return {
      apiProbe: 'failed',
      apiProbeError: 'createClient retornou null — verifique URL e SERVICE_ROLE_KEY',
    };
  }

  try {
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error) {
      return {
        apiProbe: 'failed',
        apiProbeError: `${error.code ?? 'error'}: ${error.message}`,
      };
    }
    return { apiProbe: 'ok' };
  } catch (error) {
    return {
      apiProbe: 'failed',
      apiProbeError: error instanceof Error ? error.message : String(error),
    };
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

/** Bootstrap diagnóstico — logs detalhados; nunca expõe segredos completos. */
export async function bootstrapSupabase(env: ServerEnv): Promise<SupabaseBootstrapReport> {
  logSupabaseEnvKeys(env);
  logPostgresEnvKeys(env);

  const adminConfigured = isSupabaseAdminConfigured(env);
  const clientPublicConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
  const postgresConfigured = isDatabaseConfigured(env.database);

  let adminClientCreated = false;
  if (adminConfigured) {
    const client = await getSupabaseAdminClient(env);
    adminClientCreated = client !== null;
    if (adminClientCreated) {
      console.log('[Supabase] Cliente admin criado — URL', maskEnvSecret(env.supabaseUrl));
    } else {
      console.error('[Supabase] Falha ao criar cliente admin após variáveis presentes.');
    }
  }

  const apiResult = await probeSupabaseApi(env);
  if (apiResult.apiProbe === 'ok') {
    console.log('[Supabase] API acessível — tabela public.profiles respondeu.');
  } else if (apiResult.apiProbe === 'failed') {
    console.error('[Supabase] Probe da API falhou:', apiResult.apiProbeError);
    if (apiResult.apiProbeError?.includes('relation') || apiResult.apiProbeError?.includes('does not exist')) {
      console.warn('[Supabase] Migrações SQL podem estar pendentes — aplique supabase/migrations/*.sql');
    }
  }

  const pgResult = await probePostgresConnection(env);
  if (pgResult.postgresProbe === 'failed') {
    console.error('[Postgres] Conexão direta falhou:', pgResult.postgresProbeError);
  }

  return {
    adminConfigured,
    clientPublicConfigured,
    adminClientCreated,
    postgresConfigured,
    ...apiResult,
    ...pgResult,
  };
}

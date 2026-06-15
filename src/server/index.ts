import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadProjectEnv, logProjectEnvLoadReport } from './config/loadEnv.js';
import { loadServerEnv } from './config/env.js';
import { createPublicClientConfig } from '../shared/publicClientConfig.js';
import { bootstrapIntentHandlers } from './handlers/bootstrapHandlers.js';
import { CombatWsHub } from './network/CombatWsHub.js';
import { createStaticServer, resolveStaticDirs } from './net/staticServer.js';
import { flushAllPersistence, initializePersistence, shutdownPersistenceStorage } from './persistence/initializePersistence.js';
import { initSessionAuthGateway } from './auth/SessionAuthGateway.js';
import { hasDatabaseConnection } from './persistence/databaseConnection.js';
import { bootstrapSupabase } from './supabase/initializeSupabase.js';

const CLIENT_DIST_ARTIFACTS = [
  'client/browser/main.js',
  'server/index.js',
] as const;

function verifyClientDistArtifacts(distDir: string): { readonly ok: boolean; readonly missing: readonly string[] } {
  const missing = CLIENT_DIST_ARTIFACTS.filter(
    (relative) => !existsSync(path.join(distDir, relative)),
  );
  return { ok: missing.length === 0, missing };
}

function logCorsWarning(corsOrigins: readonly string[], nodeEnv: string): void {
  if (nodeEnv === 'production' && corsOrigins.length === 0) {
    console.warn(
      '[server] CORS_ORIGIN não definido em produção — apenas same-origin e clientes sem header Origin.',
    );
  }
}

async function main(): Promise<void> {
  const envLoadReport = loadProjectEnv();
  logProjectEnvLoadReport(envLoadReport);
  const env = loadServerEnv();
  logCorsWarning(env.corsOrigins, env.nodeEnv);
  initSessionAuthGateway(env);
  const supabaseReport = await bootstrapSupabase(env);

  const persistence = await initializePersistence();

  const dirs = resolveStaticDirs(import.meta.url);
  const httpServer = createStaticServer({
    ...dirs,
    corsOrigins: env.corsOrigins,
    serverEnv: env,
    clientPublicConfig: createPublicClientConfig({
      ...(env.supabaseUrl ? { supabaseUrl: env.supabaseUrl } : {}),
      ...(env.supabaseAnonKey ? { supabaseAnonKey: env.supabaseAnonKey } : {}),
      ...(env.gameWsUrl ? { gameWsUrl: env.gameWsUrl } : {}),
    }),
  });

  bootstrapIntentHandlers();
  const wsHub = new CombatWsHub(httpServer, { corsOrigins: env.corsOrigins });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} — encerrando…`);
    void flushAllPersistence()
      .then(() => shutdownPersistenceStorage())
      .catch((error) => {
        console.error('[persistence] Falha no flush final:', error);
      })
      .finally(() => {
        void wsHub
          .close()
          .then(() => {
            httpServer.close((error) => {
              if (error) {
                console.error('[server] Erro ao fechar HTTP:', error);
                process.exit(1);
              }
              process.exit(0);
            });
          })
          .catch((error) => {
            console.error('[server] Erro ao fechar WebSocket:', error);
            process.exit(1);
          });
      });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  const distCheck = verifyClientDistArtifacts(dirs.distDir);
  console.log('[bootstrap] Pronto para escutar', {
    port: env.port,
    host: env.host,
    nodeEnv: env.nodeEnv,
    persistence: persistence.mode,
    dataDir: persistence.dataDir,
    clientDistOk: distCheck.ok,
    ...(distCheck.ok
      ? { clientArtifacts: [...CLIENT_DIST_ARTIFACTS] }
      : { missingClientArtifacts: distCheck.missing }),
  });
  if (!distCheck.ok) {
    console.warn(
      '[bootstrap] dist/ incompleto — rode npm run build antes de npm start. Ausentes:',
      distCheck.missing.join(', '),
    );
  }

  httpServer.listen(env.port, env.host, () => {
    const scheme = env.nodeEnv === 'production' ? 'https/wss (via proxy)' : 'http';
    console.log('[Altercadia V2] Servidor online');
    console.log(`  NODE_ENV     → ${env.nodeEnv}`);
    console.log(`  Persistência → ${persistence.mode} (${persistence.dataDir})`);
    console.log(
      `  Supabase API → ${supabaseReport.adminClientCreated && supabaseReport.apiProbe === 'ok'
        ? 'conectado'
        : supabaseReport.adminConfigured
          ? `parcial (probe: ${supabaseReport.apiProbe}${supabaseReport.apiProbeError ? ` — ${supabaseReport.apiProbeError}` : ''})`
          : 'não configurado (SUPABASE_URL + SERVICE_ROLE)'}`,
    );
    console.log(
      `  Supabase Auth (browser) → ${supabaseReport.clientPublicConfigured ? 'configurado' : 'não configurado (SUPABASE_URL + ANON_KEY)'}`,
    );
    console.log(
      `  Postgres direto → ${hasDatabaseConnection()
        ? (supabaseReport.postgresProbe === 'ok' ? 'conectado' : supabaseReport.postgresProbe === 'failed'
          ? `falhou (${supabaseReport.postgresProbeError ?? 'erro'})`
          : 'configurado (não testado)')
        : 'não configurado (opcional — use DATABASE_URL se PERSISTENCE_MODE=postgres)'}`,
    );
    console.log(`  Bind         → ${env.host}:${env.port}`);
    console.log(`  HTTP         → ${scheme}://<host>:${env.port}`);
    console.log(`  WebSocket    → ws(s)://<host>:${env.port}/ws`);
    console.log(`  Health       → /health`);
    console.log(`  CORS origins → ${env.corsOrigins.length ? env.corsOrigins.join(', ') : '(nenhum — defina CORS_ORIGIN)'}`);
    console.log('  Protocolo    → ws (nativo) + combat-join / combat-action / combat-event');
  });
}

void main().catch((error) => {
  console.error('[server] Falha fatal no bootstrap:', error);
  process.exit(1);
});

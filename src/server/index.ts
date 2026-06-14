import { loadServerEnv } from './config/env.js';
import { createPublicClientConfig } from '../shared/publicClientConfig.js';
import { bootstrapIntentHandlers } from './handlers/bootstrapHandlers.js';
import { CombatWsHub } from './network/CombatWsHub.js';
import { createStaticServer, resolveStaticDirs } from './net/staticServer.js';
import { flushAllPersistence, initializePersistence } from './persistence/initializePersistence.js';

function logCorsWarning(corsOrigins: readonly string[], nodeEnv: string): void {
  if (nodeEnv === 'production' && corsOrigins.length === 0) {
    console.warn(
      '[server] CORS_ORIGIN não definido em produção — apenas same-origin e clientes sem header Origin.',
    );
  }
}

async function main(): Promise<void> {
  const env = loadServerEnv();
  logCorsWarning(env.corsOrigins, env.nodeEnv);

  const persistence = await initializePersistence();

  const dirs = resolveStaticDirs(import.meta.url);
  const httpServer = createStaticServer({
    ...dirs,
    corsOrigins: env.corsOrigins,
    clientPublicConfig: createPublicClientConfig({
      ...(env.supabaseUrl ? { supabaseUrl: env.supabaseUrl } : {}),
      ...(env.supabaseAnonKey ? { supabaseAnonKey: env.supabaseAnonKey } : {}),
    }),
  });

  bootstrapIntentHandlers();
  const wsHub = new CombatWsHub(httpServer, { corsOrigins: env.corsOrigins });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} — encerrando…`);
    void flushAllPersistence()
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

  httpServer.listen(env.port, env.host, () => {
    const scheme = env.nodeEnv === 'production' ? 'https/wss (via proxy)' : 'http';
    console.log('[Altercadia V2] Servidor online');
    console.log(`  NODE_ENV     → ${env.nodeEnv}`);
    console.log(`  Persistência → ${persistence.mode} (${persistence.dataDir})`);
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

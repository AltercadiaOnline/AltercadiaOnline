import type http from 'node:http';
import type { ServerEnv } from '../config/env.js';
import { tryGetServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { getCriticalPersistMetricsSummary } from '../supabase/criticalPersistMetrics.js';
import { getPersistenceManager } from '../supabase/persistenceManagerRegistry.js';

function readOpsToken(req: http.IncomingMessage): string | null {
  const headerToken = req.headers['x-ops-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }

  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    return token || null;
  }

  return null;
}

function isOpsAuthorized(req: http.IncomingMessage, env: ServerEnv): boolean {
  const configuredToken = env.opsToken;
  if (!configuredToken) {
    return env.nodeEnv !== 'production';
  }

  return readOpsToken(req) === configuredToken;
}

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export async function handleCriticalPersistOpsRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  env: ServerEnv,
): Promise<boolean> {
  if (url.pathname !== '/ops/persistence/critical') {
    return false;
  }

  if (req.method !== 'GET') {
    writeJson(res, 405, { ok: false, error: 'Method not allowed.' });
    return true;
  }

  if (!isOpsAuthorized(req, env)) {
    writeJson(res, 403, {
      ok: false,
      error: env.opsToken
        ? 'Ops token inválido ou ausente.'
        : 'Endpoint desabilitado em produção sem OPS_TOKEN.',
    });
    return true;
  }

  const instance = tryGetServerInstanceContext();
  const manager = getPersistenceManager();

  writeJson(res, 200, {
    ok: true,
    service: 'altercadia-v2',
    ...(instance
      ? {
          serverId: instance.id,
          serverName: instance.displayName,
        }
      : {}),
    persistence: {
      supabaseEnabled: manager?.isEnabled() ?? false,
      critical: getCriticalPersistMetricsSummary(),
    },
  });
  return true;
}

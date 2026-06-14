import { loadProjectEnv } from '../config/loadEnv.js';
import { loadServerEnv, type ServerEnv } from '../config/env.js';
import { initSessionAuthGateway } from '../auth/SessionAuthGateway.js';

let cachedEnv: ServerEnv | null = null;

/** Bootstrap idempotente para rotas serverless Vercel (HTTP API). */
export function ensureVercelServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;
  loadProjectEnv();
  cachedEnv = loadServerEnv();
  initSessionAuthGateway(cachedEnv);
  return cachedEnv;
}

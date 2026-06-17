import { loadProjectEnv } from '../config/loadEnv.js';
import { loadServerEnv, type ServerEnv } from '../config/env.js';
import { initSessionAuthGateway } from '../auth/SessionAuthGateway.js';
import { bootstrapSupabase } from '../supabase/initializeSupabase.js';

let cachedEnv: ServerEnv | null = null;
let supabaseBootstrapPromise: Promise<void> | null = null;

/** Bootstrap idempotente para rotas serverless Vercel (HTTP API). */
export function ensureVercelServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;
  loadProjectEnv();
  cachedEnv = loadServerEnv();
  initSessionAuthGateway(cachedEnv);
  return cachedEnv;
}

/** Garante Supabase admin validado antes de rotas que dependem do banco. */
export function ensureVercelSupabaseBootstrap(): Promise<void> {
  if (!supabaseBootstrapPromise) {
    supabaseBootstrapPromise = (async () => {
      const env = ensureVercelServerEnv();
      await bootstrapSupabase(env);
    })();
  }
  return supabaseBootstrapPromise;
}

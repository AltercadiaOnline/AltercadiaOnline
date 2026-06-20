import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureVercelServerEnv, ensureVercelSupabaseBootstrap } from '../dist/server/vercel/bootstrap.js';
import { handlePlayerSnapshotRoute } from '../dist/server/net/playerSnapshotRoute.js';

/** @deprecated Cliente chama Railway diretamente via gameServerFetch — fallback serverless. */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    await ensureVercelSupabaseBootstrap();
    const env = ensureVercelServerEnv();
    const host = req.headers.host ?? 'localhost';
    const url = new URL(req.url ?? '/api/player-snapshot', `https://${host}`);
    await handlePlayerSnapshotRoute(req, res, url, env);
  } catch (error) {
    console.error('[api/player-snapshot] Bootstrap Supabase falhou:', error);
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Supabase indisponível.',
      retryable: false,
    });
  }
}

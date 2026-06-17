import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureVercelServerEnv, ensureVercelSupabaseBootstrap } from '../dist/server/vercel/bootstrap.js';
import { handleCharacterHubRoute } from '../dist/server/net/characterHubRoute.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    await ensureVercelSupabaseBootstrap();
    const env = ensureVercelServerEnv();
    const host = req.headers.host ?? 'localhost';
    const url = new URL(req.url ?? '/api/character-hub', `https://${host}`);
    await handleCharacterHubRoute(req, res, url, env);
  } catch (error) {
    console.error('[api/character-hub] Bootstrap Supabase falhou:', error);
    res.status(503).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Supabase indisponível.',
    });
  }
}

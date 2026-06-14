import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureVercelServerEnv } from '../dist/server/vercel/bootstrap.js';
import { handlePlayerSnapshotRoute } from '../dist/server/net/playerSnapshotRoute.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const env = ensureVercelServerEnv();
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/api/player-snapshot', `https://${host}`);
  await handlePlayerSnapshotRoute(req, res, url, env);
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureVercelServerEnv } from '../dist/server/vercel/bootstrap.js';
import { buildServerListPayload } from '../dist/server/net/serverListRoute.js';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const env = ensureVercelServerEnv();
  const payload = buildServerListPayload(env);
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json(payload);
}

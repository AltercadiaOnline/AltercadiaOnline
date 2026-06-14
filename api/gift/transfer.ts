import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureVercelServerEnv } from '../../dist/server/vercel/bootstrap.js';
import { handleGiftTransferRoute } from '../../dist/server/net/giftTransferRoute.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const env = ensureVercelServerEnv();
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/api/gift/transfer', `https://${host}`);
  await handleGiftTransferRoute(req, res, url, env);
}

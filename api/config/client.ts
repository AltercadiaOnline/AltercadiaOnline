import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClientConfig } from '../../dist/shared/publicClientConfig.js';
import { ensureVercelServerEnv } from '../../dist/server/vercel/bootstrap.js';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const env = ensureVercelServerEnv();
  const config = createPublicClientConfig({
    ...(env.supabaseUrl ? { supabaseUrl: env.supabaseUrl } : {}),
    ...(env.supabaseAnonKey ? { supabaseAnonKey: env.supabaseAnonKey } : {}),
    ...(env.gameWsUrl ? { gameWsUrl: env.gameWsUrl } : {}),
    ...(env.gameHttpUrl ? { gameHttpUrl: env.gameHttpUrl } : {}),
    serverId: env.serverInstance.id,
    serverName: env.serverInstance.displayName,
  });
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(config);
}

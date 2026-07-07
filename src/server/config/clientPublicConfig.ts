import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { createPublicClientConfig } from '../../shared/publicClientConfig.js';
import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import type { ServerEnv } from './env.js';

function resolveClientDevStamp(distDir: string): string | undefined {
  const mainJs = path.join(distDir, 'client', 'browser', 'main.js');
  if (!existsSync(mainJs)) return undefined;
  return `dev-${Math.floor(statSync(mainJs).mtimeMs)}`;
}

/**
 * Config exposta em GET /config/client.
 * Em desenvolvimento o monólito (npm run dev) serve front + WS na mesma origem —
 * não publicar GAME_WS_URL/GAME_HTTP_URL do Railway para o browser tentar Railway em vez de /ws local.
 */
export function createServerPublicClientConfig(
  env: ServerEnv,
  distDir?: string,
): PublicClientConfig {
  const exposeRemoteGameEndpoints = env.nodeEnv === 'production';
  const clientDevStamp =
    env.nodeEnv === 'development' && distDir ? resolveClientDevStamp(distDir) : undefined;

  return createPublicClientConfig({
    ...(env.supabaseUrl ? { supabaseUrl: env.supabaseUrl } : {}),
    ...(env.supabaseAnonKey ? { supabaseAnonKey: env.supabaseAnonKey } : {}),
    ...(exposeRemoteGameEndpoints && env.gameWsUrl ? { gameWsUrl: env.gameWsUrl } : {}),
    ...(exposeRemoteGameEndpoints && env.gameHttpUrl ? { gameHttpUrl: env.gameHttpUrl } : {}),
    ...(env.publicSiteUrl ? { publicSiteUrl: env.publicSiteUrl } : {}),
    serverId: env.serverInstance.id,
    serverName: env.serverInstance.displayName,
    ...(clientDevStamp ? { clientDevStamp } : {}),
  });
}

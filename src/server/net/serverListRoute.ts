import type http from 'node:http';
import type { ServerEnv } from '../config/env.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { listCharSelectShardDefinitions } from '../../shared/world/serverInstanceCatalog.js';
import type { ServerListResponse } from '../../shared/world/serverListProtocol.js';

function buildPublicServerList(deployId: string): ServerListResponse['servers'] {
  return listCharSelectShardDefinitions().map((definition) => ({
    id: definition.id,
    displayName: definition.displayName,
    mapIds: definition.mapIds,
    isCurrentDeploy: definition.id === deployId,
    selectable: definition.charSelectSelectable === true,
  }));
}

export async function handleServerListRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<boolean> {
  if (url.pathname !== '/api/servers') {
    return false;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }));
    return true;
  }

  const deployId = getServerInstanceContext().id;
  const payload: ServerListResponse = {
    ok: true,
    defaultServerId: deployId,
    servers: buildPublicServerList(deployId),
  };

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
  });
  res.end(JSON.stringify(payload));
  return true;
}

/** Handler para bootstrap sem contexto de instância (fallback). */
export function buildServerListPayload(env: ServerEnv): ServerListResponse {
  const deployId = env.serverInstance.id;
  return {
    ok: true,
    defaultServerId: deployId,
    servers: buildPublicServerList(deployId),
  };
}

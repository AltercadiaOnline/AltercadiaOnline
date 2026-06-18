import type { ServerInstanceDefinition } from '../../shared/world/serverInstanceCatalog.js';
import { resolveServerInstanceDefinition } from '../../shared/world/serverInstanceCatalog.js';
import type { NodeEnv } from './env.js';

export function parseServerIdFromEnv(
  raw: string | undefined,
  nodeEnv: NodeEnv,
): string {
  const trimmed = raw?.trim().toLowerCase() ?? '';
  if (trimmed) return trimmed;

  if (nodeEnv === 'production') {
    console.warn(
      '[server] SERVER_ID ausente — usando "default". Defina SERVER_ID=azul (ou outro) no Railway.',
    );
  }

  return 'default';
}

export function resolveServerInstanceFromEnv(
  env: NodeJS.ProcessEnv,
  nodeEnv: NodeEnv,
): ServerInstanceDefinition {
  const serverId = parseServerIdFromEnv(env.SERVER_ID, nodeEnv);
  return resolveServerInstanceDefinition(serverId);
}

/** Nome do banco por instância — `DATABASE_NAME_AZUL` ou `databaseName` do catálogo. */
export function resolveInstanceDatabaseName(
  env: NodeJS.ProcessEnv,
  instance: ServerInstanceDefinition,
): string | null {
  if (instance.databaseName?.trim()) {
    return instance.databaseName.trim();
  }

  const envKey = `DATABASE_NAME_${instance.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const fromEnv = env[envKey]?.trim();
  return fromEnv || null;
}

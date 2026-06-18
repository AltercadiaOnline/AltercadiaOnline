import { CITY_01_ID } from './maps/city01.js';
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import type { MapId } from './mapRegistry.js';

/** Definição estática de um shard / instância de mundo. */
export type ServerInstanceDefinition = {
  readonly id: string;
  readonly displayName: string;
  /** Mapas que esta instância hospeda. */
  readonly mapIds: readonly MapId[];
  /** NPCs permitidos — se omitido, todos os NPCs dos mapIds. */
  readonly npcIds?: readonly string[];
  /** Mapa padrão de spawn / correção quando o jogador está fora do escopo. */
  readonly defaultMapId: MapId;
  /** Sobrescreve DATABASE_NAME quando definido (ou use DATABASE_NAME_<ID> no env). */
  readonly databaseName?: string;
};

export const SERVER_INSTANCE_CATALOG: Record<string, ServerInstanceDefinition> = {
  default: {
    id: 'default',
    displayName: 'Altercadia Principal',
    mapIds: [CITY_01_ID, FARM_ZONE_01_ID],
    defaultMapId: CITY_01_ID,
  },
  azul: {
    id: 'azul',
    displayName: 'Servidor Azul',
    mapIds: [CITY_01_ID],
    defaultMapId: CITY_01_ID,
    databaseName: 'altercadia_azul',
  },
};

const catalogIds = new Set(Object.keys(SERVER_INSTANCE_CATALOG));

export function isKnownServerInstanceId(serverId: string): boolean {
  return catalogIds.has(serverId);
}

export function resolveServerInstanceDefinition(
  serverId: string | undefined | null,
): ServerInstanceDefinition {
  const normalized = serverId?.trim().toLowerCase() || 'default';
  const definition = SERVER_INSTANCE_CATALOG[normalized];
  if (!definition) {
    throw new Error(
      `SERVER_ID inválido: "${serverId}". Valores: ${[...catalogIds].join(', ')}`,
    );
  }
  return definition;
}

export function isMapAllowedOnInstance(
  mapId: string,
  instance: ServerInstanceDefinition,
): boolean {
  return instance.mapIds.includes(mapId as MapId);
}

export function isNpcAllowedOnInstance(
  npcId: string,
  mapId: string,
  instance: ServerInstanceDefinition,
): boolean {
  if (!isMapAllowedOnInstance(mapId, instance)) return false;
  if (!instance.npcIds?.length) return true;
  return instance.npcIds.includes(npcId);
}

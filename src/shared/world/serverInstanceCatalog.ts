import { CITY_01_ID } from './maps/city01.js';
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import type { MapId } from './mapRegistry.js';

/** Ordem fixa na char select — Azul, Vermelho, Roxo. */
export const PLAYER_SHARD_ORDER = ['azul', 'vermelho', 'roxo'] as const;

export type PlayerShardId = (typeof PLAYER_SHARD_ORDER)[number];

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
  /** Exibir na char select. `default` é legado interno — oculto do jogador. */
  readonly charSelectVisible?: boolean;
  /** Jogador pode escolher este shard (rollout gradual). */
  readonly charSelectSelectable?: boolean;
};

export const SERVER_INSTANCE_CATALOG: Record<string, ServerInstanceDefinition> = {
  /** Legado — dev/local sem SERVER_ID explícito. Não listado na char select. */
  default: {
    id: 'default',
    displayName: 'Altercadia Principal',
    mapIds: [CITY_01_ID, FARM_ZONE_01_ID],
    defaultMapId: CITY_01_ID,
    charSelectVisible: false,
  },
  azul: {
    id: 'azul',
    displayName: 'Servidor Azul',
    mapIds: [CITY_01_ID],
    defaultMapId: CITY_01_ID,
    databaseName: 'altercadia_azul',
    charSelectVisible: true,
    charSelectSelectable: true,
  },
  vermelho: {
    id: 'vermelho',
    displayName: 'Servidor Vermelho',
    mapIds: [FARM_ZONE_01_ID],
    defaultMapId: FARM_ZONE_01_ID,
    databaseName: 'altercadia_vermelho',
    charSelectVisible: true,
    charSelectSelectable: false,
  },
  roxo: {
    id: 'roxo',
    displayName: 'Servidor Roxo',
    mapIds: [CITY_01_ID, FARM_ZONE_01_ID],
    defaultMapId: CITY_01_ID,
    databaseName: 'altercadia_roxo',
    charSelectVisible: true,
    charSelectSelectable: false,
  },
};

const catalogIds = new Set(Object.keys(SERVER_INSTANCE_CATALOG));

export function isKnownServerInstanceId(serverId: string): boolean {
  return catalogIds.has(serverId);
}

export function isPlayerShardId(serverId: string): serverId is PlayerShardId {
  return (PLAYER_SHARD_ORDER as readonly string[]).includes(serverId);
}

/** Shards visíveis na char select, na ordem Azul → Vermelho → Roxo. */
export function listCharSelectShardDefinitions(): ServerInstanceDefinition[] {
  return PLAYER_SHARD_ORDER
    .map((id) => SERVER_INSTANCE_CATALOG[id])
    .filter((def): def is ServerInstanceDefinition => def !== undefined);
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

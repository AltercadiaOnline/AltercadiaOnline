import {
  CITY_01_STRUCTURE_DEFS,
  type City01StructureDef,
} from './maps/city01LayoutConstants.js';

/** IDs estáveis dos NPCs de serviço (economia). */
export const FERREIRO_NPC = 'ferreiro' as const;
export const VENDEDOR_NPC = 'vendedor' as const;
export const ALQUIMISTA_NPC = 'alquimista' as const;
export const BANQUEIRO_NPC = 'banqueiro' as const;
export const TERMINAL_MERCADO_NPC = 'terminal_mercado' as const;

/** Somente estes NPCs passam pelo sistema de ancoragem automática. */
export const SERVICE_NPC_IDS = [
  FERREIRO_NPC,
  VENDEDOR_NPC,
  ALQUIMISTA_NPC,
  BANQUEIRO_NPC,
  TERMINAL_MERCADO_NPC,
] as const;

export type ServiceNpcId = (typeof SERVICE_NPC_IDS)[number];

/**
 * Mapeia o ID do edifício ao NPC de serviço correspondente.
 * Para adicionar um quarto NPC de serviço: inclua aqui + em SERVICE_NPC_IDS.
 */
export const SERVICE_NPC_ANCHORS: Readonly<Record<string, ServiceNpcId>> = {
  ferreiro_house: FERREIRO_NPC,
  vendedor_house: VENDEDOR_NPC,
  alquimista_house: ALQUIMISTA_NPC,
  banqueiro_house: BANQUEIRO_NPC,
  market_block: TERMINAL_MERCADO_NPC,
};

const SERVICE_NPC_ID_SET = new Set<string>(SERVICE_NPC_IDS);

const BUILDING_BY_SERVICE_NPC = new Map<ServiceNpcId, string>(
  Object.entries(SERVICE_NPC_ANCHORS).map(([buildingId, npcId]) => [
    npcId,
    buildingId,
  ]),
);

export function isServiceNpcId(npcId: string): npcId is ServiceNpcId {
  return SERVICE_NPC_ID_SET.has(npcId);
}

export function shouldApplyBuildingAnchor(npcId: string): boolean {
  return isServiceNpcId(npcId);
}

/** Tile na porta sul do edifício — NPC “morando” na frente da casa. */
export function resolveBuildingDoorTile(
  structure: Pick<City01StructureDef, 'tileX' | 'tileY' | 'tileW' | 'tileH'>,
): { readonly tileX: number; readonly tileY: number } {
  return {
    tileX: structure.tileX + Math.floor(structure.tileW / 2),
    tileY: structure.tileY + structure.tileH,
  };
}

export function findStructureForServiceNpc(
  npcId: ServiceNpcId,
  structures: readonly City01StructureDef[] = CITY_01_STRUCTURE_DEFS,
): City01StructureDef | undefined {
  const buildingId = BUILDING_BY_SERVICE_NPC.get(npcId);
  if (!buildingId) return undefined;
  return structures.find((structure) => structure.id === buildingId);
}

/** Resolve tile ancorado — null se NPC não for de serviço ou edifício ausente. */
export function resolveServiceNpcAnchorTile(
  npcId: string,
  structures: readonly City01StructureDef[] = CITY_01_STRUCTURE_DEFS,
): { readonly tileX: number; readonly tileY: number } | null {
  if (!isServiceNpcId(npcId)) return null;

  const structure = findStructureForServiceNpc(npcId, structures);
  if (!structure) return null;

  return resolveBuildingDoorTile(structure);
}

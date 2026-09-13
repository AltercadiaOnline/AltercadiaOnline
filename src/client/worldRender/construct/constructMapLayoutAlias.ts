import type { MapId } from '../../../shared/world/mapRegistry.js';
import { TOWER_CONSTRUCT_LAYOUT_BY_MAP_ID } from '../../../shared/tower/towerMapCatalog.js';

/** Layouts no Construct 3 ↔ ids autoritativos Altercadia. */
export const CONSTRUCT_LAYOUT_BY_MAP_ID: Readonly<Record<MapId, string>> = {
  city_01: 'cidade_01',
  /** Export atual usa `zonabeco1`; legado: `beco_dos_fundos_zona1`. */
  farm_zone_01: 'zonabeco1',
  ...TOWER_CONSTRUCT_LAYOUT_BY_MAP_ID,
};

/** Nomes de layout aceitos no export (atual + legado). */
export const CONSTRUCT_LAYOUT_NAME_ALIASES: Readonly<Record<string, string>> = {
  zonabeco1: 'zonabeco1',
  beco_dos_fundos_zona1: 'zonabeco1',
  cidade_01: 'cidade_01',
  entradatorredopoder: 'entradatorredopoder',
  andar_1_torre_poder: 'andar_1_torre_poder',
  andar_2_torre_poder: 'andar_2_torre_poder',
  andar_3_torre_poder: 'andar_3_torre_poder',
  andar_4_torre_poder2: 'andar_4_torre_poder2',
  andar_5_torre_poder3: 'andar_5_torre_poder3',
};

/** Markers Construct com typo / legado → id do registry. */
export const CONSTRUCT_NPC_MARKER_ALIASES: Readonly<Record<string, string>> = {
  npc_treinador_pet: 'treinador_zeno',
  npc_contrabandista: 'contrabandista',
  npc_receptador: 'receptador',
  npc_operario_linha4: 'operario_linha4',
  npc_humano_1: 'humano_1',
  npc_humano_2: 'humano_2',
  npc_mercador_rua: 'mercador_rua',
  npc_tecnico_manutencao: 'tecnico_manutencao',
  npc_membro_gang_rosa: 'membro_gang_rosa',
  'npc_cão_robo': 'cao_robo',
  computador_zona1a: 'computador_zona1a',
  computador_zona1b: 'computador_zona1b',
  computador_zona1c: 'computador_zona1c',
  computador_marktplace: 'computador_marketplace',
  computador_towerpower: 'computador_towerpower',
  spawn_players: 'player_spawn',
};

export function resolveConstructLayoutId(mapId: MapId, constructLayout?: string): string {
  if (mapId === 'farm_zone_01' && constructLayout) return constructLayout;
  return CONSTRUCT_LAYOUT_BY_MAP_ID[mapId] ?? mapId;
}

export function resolveConstructNpcMarker(markerId: string): string {
  return CONSTRUCT_NPC_MARKER_ALIASES[markerId] ?? markerId;
}

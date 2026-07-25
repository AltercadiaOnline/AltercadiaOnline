import type { MapId } from '../../../shared/world/mapRegistry.js';

/** Layouts no Construct 3 ↔ ids autoritativos Altercadia. */
export const CONSTRUCT_LAYOUT_BY_MAP_ID: Readonly<Record<MapId, string>> = {
  city_01: 'cidade_01',
  /** Export atual usa `zonabeco1`; legado: `beco_dos_fundos_zona1`. */
  farm_zone_01: 'zonabeco1',
};

/** Nomes de layout aceitos no export (atual + legado). */
export const CONSTRUCT_LAYOUT_NAME_ALIASES: Readonly<Record<string, string>> = {
  zonabeco1: 'zonabeco1',
  beco_dos_fundos_zona1: 'zonabeco1',
  cidade_01: 'cidade_01',
};

/** Markers Construct com typo / legado → id do registry. */
export const CONSTRUCT_NPC_MARKER_ALIASES: Readonly<Record<string, string>> = {
  npc_treinador_pet: 'treinador_zeno',
  computador_marktplace: 'computador_marketplace',
  spawn_players: 'player_spawn',
};

export function resolveConstructLayoutId(mapId: MapId): string {
  return CONSTRUCT_LAYOUT_BY_MAP_ID[mapId] ?? mapId;
}

export function resolveConstructNpcMarker(markerId: string): string {
  return CONSTRUCT_NPC_MARKER_ALIASES[markerId] ?? markerId;
}

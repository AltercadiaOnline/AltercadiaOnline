import { CITY_01_ID } from './maps/city01.js';
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import {
  TOWER_FLOOR_1_ID,
  TOWER_FLOOR_2_ID,
  TOWER_FLOOR_3_ID,
  TOWER_FLOOR_4_ID,
  TOWER_FLOOR_5_ID,
  TOWER_GATE_ID,
} from './maps/towerMaps.js';
import type { MapId } from './mapRegistry.js';

const MAP_CHAT_LABELS: Record<MapId, string> = {
  [CITY_01_ID]: 'Cidade',
  [FARM_ZONE_01_ID]: 'Beco',
  [TOWER_GATE_ID]: 'Torre — Entrada',
  [TOWER_FLOOR_1_ID]: 'Torre — Andar 1',
  [TOWER_FLOOR_2_ID]: 'Torre — Andar 2',
  [TOWER_FLOOR_3_ID]: 'Torre — Andar 3',
  [TOWER_FLOOR_4_ID]: 'Torre — Andar 4',
  [TOWER_FLOOR_5_ID]: 'Torre — Andar 5',
};

/** Código curto da zona para HUD (ex.: Z1, C1). */
const MAP_ZONE_CODES: Record<MapId, string> = {
  [CITY_01_ID]: 'C1',
  [FARM_ZONE_01_ID]: 'Z1',
  [TOWER_GATE_ID]: 'TP',
  [TOWER_FLOOR_1_ID]: 'T1',
  [TOWER_FLOOR_2_ID]: 'T2',
  [TOWER_FLOOR_3_ID]: 'T3',
  [TOWER_FLOOR_4_ID]: 'T4',
  [TOWER_FLOOR_5_ID]: 'T5',
};

/** Nome curto da zona para o painel do chat global (top-down, todas as áreas). */
export function getMapChatLabel(mapId: string): string {
  return MAP_CHAT_LABELS[mapId as MapId] ?? mapId;
}

/** Linha de contexto da barra lateral — ex.: `ZONE: Z1 — Beco`. */
export function getMapZoneHudLine(mapId: string | null | undefined): string {
  if (!mapId) return 'ZONE: —';
  const code = MAP_ZONE_CODES[mapId as MapId] ?? '??';
  const name = getMapChatLabel(mapId);
  return `ZONE: ${code} — ${name}`;
}

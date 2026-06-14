import { CITY_01_ID } from './maps/city01.js';
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import type { MapId } from './mapRegistry.js';

const MAP_CHAT_LABELS: Record<MapId, string> = {
  [CITY_01_ID]: 'Cidade',
  [FARM_ZONE_01_ID]: 'Beco',
};

/** Nome curto da zona para o painel do chat global (top-down, todas as áreas). */
export function getMapChatLabel(mapId: string): string {
  return MAP_CHAT_LABELS[mapId as MapId] ?? mapId;
}

import { CITY_01_ID } from '../../../shared/world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../../../shared/world/maps/farm_zone_01.js';

export type MapSyncStatus = {
  readonly label: 'Estável' | 'Instável';
  readonly stable: boolean;
  readonly signalBars: number;
  readonly mapLabel: string;
};

const SYNC_BAR_COUNT = 4;

const MAP_LABELS: Readonly<Record<string, string>> = {
  [CITY_01_ID]: 'Cidade 01',
  [FARM_ZONE_01_ID]: 'Beco dos Fundos',
};

/** Zonas instáveis distorcem a sincronia do terminal com o servidor. */
export function resolveMapSyncStatus(mapId: string | null | undefined): MapSyncStatus {
  const mapLabel = mapId ? (MAP_LABELS[mapId] ?? mapId) : 'Desconhecida';

  if (mapId === FARM_ZONE_01_ID) {
    return {
      label: 'Instável',
      stable: false,
      signalBars: 2,
      mapLabel,
    };
  }

  return {
    label: 'Estável',
    stable: true,
    signalBars: SYNC_BAR_COUNT,
    mapLabel,
  };
}

export function renderSyncSignalBars(activeBars: number): string {
  return Array.from({ length: SYNC_BAR_COUNT }, (_, index) => {
    const height = 4 + index * 3;
    const active = index < activeBars;
    return `<span class="character-sync__bar${active ? ' character-sync__bar--active' : ''}" style="--bar-h:${height}px"></span>`;
  }).join('');
}

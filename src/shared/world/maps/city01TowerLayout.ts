import type { City01StructureDef } from './city01LayoutConstants.js';
import { CITY_01_TOWER_AREA } from '../localizedHeight.js';
import type { HeightLevel } from '../localizedHeight.js';

export type City01TowerStructureDef = City01StructureDef & {
  readonly heightLevel: HeightLevel;
  readonly assetKey: string;
};

/** Estruturas da torre — cada bloco com height_level para Z-sort local. */
export const CITY_01_TOWER_STRUCTURE_DEFS: readonly City01TowerStructureDef[] = [
  {
    id: 'tower_wing_ground',
    label: 'TORRE Nv.0',
    tileX: 4,
    tileY: 34,
    tileW: 4,
    tileH: 3,
    heightLevel: 0,
    assetKey: 'tower_wing',
  },
  {
    id: 'tower_wing_mid',
    label: 'TORRE Nv.1',
    tileX: 4,
    tileY: 31,
    tileW: 4,
    tileH: 2,
    heightLevel: 1,
    assetKey: 'tower_wing',
  },
  {
    id: 'tower_wing_high',
    label: 'TORRE Nv.2',
    tileX: 4,
    tileY: 28,
    tileW: 4,
    tileH: 2,
    heightLevel: 2,
    assetKey: 'tower_wing',
  },
  {
    id: 'tower_spire',
    label: 'TORRE Nv.3',
    tileX: 5,
    tileY: 26,
    tileW: 3,
    tileH: 2,
    heightLevel: 3,
    assetKey: 'tower_spire',
  },
] as const;

export { CITY_01_TOWER_AREA };

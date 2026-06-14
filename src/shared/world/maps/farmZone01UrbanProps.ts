import type { UrbanPropId } from '../../../assets/urban/urbanAssetManifest.js';
import {
  FARM_ZONE_01_ALLEY_MAX,
  FARM_ZONE_01_ALLEY_MIN,
} from './farmZone01LayoutConstants.js';

/** Prop urbano no Beco — footprint em tiles (40px). */
export type FarmZone01UrbanPropDef = {
  readonly assetKey: UrbanPropId;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

const WEST_EDGE = FARM_ZONE_01_ALLEY_MIN;
const EAST_EDGE = FARM_ZONE_01_ALLEY_MAX;

/**
 * Ambiente beco EUA/Tóquio — props ao longo do corredor e nas fachadas laterais.
 * Execute `npm run seed:terrain` antes do primeiro boot.
 */
export const FARM_ZONE_01_URBAN_PROP_DEFS: readonly FarmZone01UrbanPropDef[] = [
  {
    assetKey: 'trash_can',
    label: 'Lixeira',
    tileX: WEST_EDGE,
    tileY: 9,
    tileW: 1,
    tileH: 1,
  },
  {
    assetKey: 'fire_hydrant',
    label: 'Hidrante',
    tileX: EAST_EDGE,
    tileY: 16,
    tileW: 1,
    tileH: 1,
  },
  {
    assetKey: 'street_light',
    label: 'Poste',
    tileX: EAST_EDGE,
    tileY: 24,
    tileW: 1,
    tileH: 2,
  },
  {
    assetKey: 'graffiti_wall',
    label: 'Grafite',
    tileX: WEST_EDGE - 1,
    tileY: 31,
    tileW: 1,
    tileH: 1,
  },
  {
    assetKey: 'fire_extinguisher',
    label: 'Extintor',
    tileX: EAST_EDGE,
    tileY: 38,
    tileW: 1,
    tileH: 1,
  },
  {
    assetKey: 'mailbox',
    label: 'Correio',
    tileX: WEST_EDGE,
    tileY: 46,
    tileW: 1,
    tileH: 1,
  },
  {
    assetKey: 'park_bench',
    label: 'Banco',
    tileX: WEST_EDGE,
    tileY: 52,
    tileW: 2,
    tileH: 1,
  },
] as const;

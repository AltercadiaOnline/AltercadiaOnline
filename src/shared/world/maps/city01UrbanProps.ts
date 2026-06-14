import type { UrbanPropId } from '../../../assets/urban/urbanAssetManifest.js';
import { CITY_01_ROAD_X_MAX, CITY_01_ROAD_X_MIN } from './city01LayoutConstants.js';

/** Prop urbano decorativo na Cidade 01 — footprint em tiles (40px). */
export type City01UrbanPropDef = {
  readonly assetKey: UrbanPropId;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

/**
 * Props de ambiente — bordas das vias principais (sem colidir com estruturas centrais).
 * Execute `npm run seed:urban-placeholders` antes do primeiro boot.
 */
export const CITY_01_URBAN_PROP_DEFS: readonly City01UrbanPropDef[] = [
  {
    assetKey: 'street_light',
    label: 'Poste',
    tileX: CITY_01_ROAD_X_MAX + 1,
    tileY: 6,
    tileW: 1,
    tileH: 2,
  },
  {
    assetKey: 'trash_can',
    label: 'Lixeira',
    tileX: CITY_01_ROAD_X_MIN - 1,
    tileY: 11,
    tileW: 1,
    tileH: 1,
  },
  {
    assetKey: 'mailbox',
    label: 'Correio',
    tileX: CITY_01_ROAD_X_MAX + 2,
    tileY: 24,
    tileW: 1,
    tileH: 1,
  },
  {
    assetKey: 'fire_hydrant',
    label: 'Hidrante',
    tileX: CITY_01_ROAD_X_MIN - 1,
    tileY: 28,
    tileW: 1,
    tileH: 1,
  },
  {
    assetKey: 'park_bench',
    label: 'Banco',
    tileX: CITY_01_ROAD_X_MAX + 2,
    tileY: 18,
    tileW: 2,
    tileH: 1,
  },
  {
    assetKey: 'fire_extinguisher',
    label: 'Extintor',
    tileX: CITY_01_ROAD_X_MAX + 3,
    tileY: 9,
    tileW: 1,
    tileH: 1,
  },
  {
    assetKey: 'graffiti_wall',
    label: 'Grafite',
    tileX: CITY_01_ROAD_X_MIN - 2,
    tileY: 32,
    tileW: 1,
    tileH: 1,
  },
] as const;

import { CITY_01_ID } from '../../world/maps/city01.js';
import { CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS } from '../../world/constructCollidableProps.js';

export const PVP_JUMBOTRON_PROP_TYPE = 'telao_pvp';

/** Base do pedestal (px) — a tela útil é a faixa de cima do Solid. */
const TELAO_STAND_PX = 18;
const SCREEN_INSET_PX = 3;

export type PvpJumbotronWorldRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** Retângulo da tela do telão em world px. Null se o mapa não tem o prop. */
export function resolvePvpJumbotronWorldRect(mapId: string): PvpJumbotronWorldRect | null {
  if (mapId !== CITY_01_ID) return null;
  const prop = CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS.find(
    (entry) => entry.mapId === mapId && entry.objectType === PVP_JUMBOTRON_PROP_TYPE,
  );
  if (!prop) return null;
  const height = Math.max(40, prop.bounds.height - TELAO_STAND_PX - SCREEN_INSET_PX);
  return {
    x: prop.bounds.x + SCREEN_INSET_PX,
    y: prop.bounds.y + SCREEN_INSET_PX,
    width: Math.max(40, prop.bounds.width - SCREEN_INSET_PX * 2),
    height,
  };
}

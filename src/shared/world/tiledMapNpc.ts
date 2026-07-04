import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
import { readTiledObjectProperty, type TiledObjectPropertySource } from './tiledMapObject.js';
import { isTiledMapObjectCollidable } from './tiledMapObject.js';
import { worldPixelToTile } from './portals.js';

export type TiledNpcObject = TiledObjectPropertySource & {
  readonly type?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** Identificador canônico do NPC — `name`, `type` ou propriedade `npcId`. */
export function resolveTiledNpcId(object: TiledNpcObject): string | null {
  const name = object.name?.trim();
  if (name && name.length > 0) return name;

  const type = object.type?.trim();
  if (type && type.length > 0) return type;

  const npcId = readTiledObjectProperty(object, 'npcId');
  if (typeof npcId === 'string' && npcId.trim().length > 0) {
    return npcId.trim();
  }

  return null;
}

/** Pés do NPC/objeto — pontos Tiled usam (x,y) direto; retângulos usam centro-base. */
export function resolveTiledObjectFeetPosition(
  object: Pick<TiledNpcObject, 'x' | 'y' | 'width' | 'height'>,
  tileSize: number = GAME_CONFIG.TILE_SIZE,
): { readonly worldX: number; readonly worldY: number; readonly tileX: number; readonly tileY: number } {
  const isPoint = object.width <= 0 && object.height <= 0;
  const worldX = isPoint
    ? object.x
    : object.x + (object.width > 0 ? object.width : tileSize) / 2;
  const worldY = isPoint
    ? object.y
    : object.y + (object.height > 0 ? object.height : tileSize);

  const tile = worldPixelToTile(worldX, worldY, tileSize);
  return {
    worldX,
    worldY,
    tileX: tile.tileX,
    tileY: tile.tileY,
  };
}

export function resolveTiledNpcCollidable(object: TiledNpcObject): boolean {
  return isTiledMapObjectCollidable(object);
}

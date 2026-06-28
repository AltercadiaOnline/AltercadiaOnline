import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
import { readTiledObjectProperty, type TiledObjectPropertySource } from './tiledMapObject.js';

export type TiledPlayerSpawn = {
  readonly x: number;
  readonly y: number;
  readonly facing?: 'north' | 'south' | 'east' | 'west';
};

export type TiledSpawnObject = TiledObjectPropertySource & {
  readonly type?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const PLAYER_SPAWN_IDENTIFIERS = new Set(['player_spawn', 'playerspawn']);

function normalizeToken(value: string | undefined): string | null {
  const token = value?.trim().toLowerCase();
  return token && token.length > 0 ? token : null;
}

/** Objeto Tiled que representa o spawn do jogador. */
export function isTiledPlayerSpawnObject(object: TiledSpawnObject): boolean {
  const name = normalizeToken(object.name);
  if (name && PLAYER_SPAWN_IDENTIFIERS.has(name)) return true;

  const type = normalizeToken(object.type);
  if (type && PLAYER_SPAWN_IDENTIFIERS.has(type)) return true;

  const spawnKind = readTiledObjectProperty(object, 'spawn');
  if (typeof spawnKind === 'string') {
    const normalized = spawnKind.trim().toLowerCase();
    if (normalized === 'player' || normalized === 'player_spawn') return true;
  }

  return false;
}

function resolveFacing(
  object: TiledSpawnObject,
): 'north' | 'south' | 'east' | 'west' | undefined {
  const raw = readTiledObjectProperty(object, 'facing');
  if (typeof raw !== 'string') return undefined;

  const facing = raw.trim().toLowerCase();
  if (facing === 'north' || facing === 'south' || facing === 'east' || facing === 'west') {
    return facing;
  }
  return undefined;
}

/** Posição dos pés do jogador a partir do retângulo/ponto Tiled (origem centro-base). */
export function resolveTiledSpawnFeetPosition(
  object: TiledSpawnObject,
): { readonly x: number; readonly y: number } {
  const width = object.width > 0 ? object.width : GAME_CONFIG.TILE_SIZE;
  const height = object.height > 0 ? object.height : GAME_CONFIG.TILE_SIZE;
  return {
    x: object.x + width / 2,
    y: object.y + height,
  };
}

export function resolveTiledPlayerSpawn(object: TiledSpawnObject): TiledPlayerSpawn | null {
  if (!isTiledPlayerSpawnObject(object)) return null;

  const feet = resolveTiledSpawnFeetPosition(object);
  const facing = resolveFacing(object);

  return facing !== undefined
    ? { x: feet.x, y: feet.y, facing }
    : { x: feet.x, y: feet.y };
}

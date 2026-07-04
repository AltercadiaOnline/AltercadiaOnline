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
  readonly visible?: boolean;
};

const PLAYER_SPAWN_IDENTIFIERS = new Set(['player_spawn', 'playerspawn']);

function normalizeToken(value: string | undefined): string | null {
  const token = value?.trim().toLowerCase();
  return token && token.length > 0 ? token : null;
}

function isMapPlayerSpawnToken(token: string): boolean {
  if (PLAYER_SPAWN_IDENTIFIERS.has(token)) return true;
  if (token === 'spawn' || token === 'player') return true;
  // Beco / zonas de hunt — ex.: spawn_zona_beco_1
  if (token.startsWith('spawn_zona_') || token.startsWith('player_spawn_')) return true;
  return false;
}

/** Objeto Tiled que representa o spawn do jogador. */
export function isTiledPlayerSpawnObject(object: TiledSpawnObject): boolean {
  const name = normalizeToken(object.name);
  if (name && isMapPlayerSpawnToken(name)) return true;

  const type = normalizeToken(object.type);
  if (type && isMapPlayerSpawnToken(type)) return true;

  const spawnKind = readTiledObjectProperty(object, 'spawn');
  if (typeof spawnKind === 'string') {
    const normalized = spawnKind.trim().toLowerCase();
    if (normalized === 'player' || normalized === 'player_spawn') return true;
  }

  return false;
}

/**
 * Único objeto em camada spawn(s) sem nome canônico — trata como player_spawn (mapas de hunt).
 */
export function resolveTiledPlayerSpawnFromLayer(
  objects: readonly TiledSpawnObject[],
): TiledPlayerSpawn | null {
  for (const object of objects) {
    const spawn = resolveTiledPlayerSpawn(object);
    if (spawn) return spawn;
  }

  const visible = objects.filter((object) => object.visible !== false);
  if (visible.length === 1) {
    const feet = resolveTiledSpawnFeetPosition(visible[0]!);
    const facing = resolveFacing(visible[0]!);
    return facing !== undefined
      ? { x: feet.x, y: feet.y, facing }
      : { x: feet.x, y: feet.y };
  }

  return null;
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

/** Posição dos pés do jogador — ponto Tiled: (x,y); retângulo: centro-X, base-Y. */
export function resolveTiledSpawnFeetPosition(
  object: TiledSpawnObject,
): { readonly x: number; readonly y: number } {
  const isPoint = object.width <= 0 && object.height <= 0;
  if (isPoint) {
    return { x: object.x, y: object.y };
  }

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

import { TILE_SIZE } from './mapConstants.js';
import { getPlayerFeetWorldY, type WorldPoint } from './playerEntity.js';
import { tileFootprintDepthY } from './worldDepthSort.js';

/** Deslocamento de profundidade por nível — domina o Y-sort local sem afetar o resto do mapa. */
export const HEIGHT_LEVEL_DEPTH_STRIDE = 5000;

export const HEIGHT_LEVEL_MIN = 0;
export const HEIGHT_LEVEL_MAX = 3;

export type HeightLevel = 0 | 1 | 2 | 3;

export type TileRect = {
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

/** Área da Torre — canto inferior esquerdo da Cidade 01 (protótipo / teste). */
export const CITY_01_TOWER_AREA: TileRect = {
  tileX: 2,
  tileY: 26,
  tileW: 7,
  tileH: 12,
};

export type LocalizedHeightStepDef = {
  readonly tileX: number;
  readonly tileY: number;
  readonly heightLevel: HeightLevel;
};

/** Degraus — coluna oeste; subir = diminuir tileY (norte no mapa). */
export const CITY_01_TOWER_STEPS: readonly LocalizedHeightStepDef[] = [
  { tileX: 3, tileY: 36, heightLevel: 0 },
  { tileX: 3, tileY: 35, heightLevel: 0 },
  { tileX: 3, tileY: 34, heightLevel: 1 },
  { tileX: 3, tileY: 33, heightLevel: 1 },
  { tileX: 3, tileY: 32, heightLevel: 2 },
  { tileX: 3, tileY: 31, heightLevel: 2 },
  { tileX: 3, tileY: 30, heightLevel: 3 },
  { tileX: 3, tileY: 29, heightLevel: 3 },
  { tileX: 3, tileY: 28, heightLevel: 3 },
] as const;

export function tileRectContains(rect: TileRect, tileX: number, tileY: number): boolean {
  return (
    tileX >= rect.tileX &&
    tileX < rect.tileX + rect.tileW &&
    tileY >= rect.tileY &&
    tileY < rect.tileY + rect.tileH
  );
}

export function isCity01TowerAreaTile(tileX: number, tileY: number): boolean {
  return tileRectContains(CITY_01_TOWER_AREA, tileX, tileY);
}

const stepByTileKey = new Map<string, HeightLevel>(
  CITY_01_TOWER_STEPS.map((step) => [`${step.tileX}:${step.tileY}`, step.heightLevel]),
);

export function resolveTowerStepHeightAtTile(tileX: number, tileY: number): HeightLevel | null {
  return stepByTileKey.get(`${tileX}:${tileY}`) ?? null;
}

export function clampHeightLevel(level: number): HeightLevel {
  const clamped = Math.max(HEIGHT_LEVEL_MIN, Math.min(HEIGHT_LEVEL_MAX, Math.floor(level)));
  return clamped as HeightLevel;
}

/** Profundidade efetiva para Y-sort com empilhamento Z local. */
export function getEffectiveDepthY(feetWorldY: number, heightLevel: number): number {
  const level = clampHeightLevel(heightLevel);
  return feetWorldY + level * HEIGHT_LEVEL_DEPTH_STRIDE;
}

export function getEntityDepthY(
  tileY: number,
  tileH: number,
  heightLevel: number,
  tileSize: number = TILE_SIZE,
): number {
  const feetY = tileFootprintDepthY(tileY, tileH, tileSize);
  return getEffectiveDepthY(feetY, heightLevel);
}

export function getPlayerDepthYWithHeight(position: WorldPoint, heightLevel: number): number {
  return getEffectiveDepthY(getPlayerFeetWorldY(position), heightLevel);
}

/** Só ativa empilhamento por altura quando o jogador está na bounding box da torre. */
export function shouldUseLocalizedHeightStacking(worldX: number, worldY: number): boolean {
  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);
  return isCity01TowerAreaTile(tileX, tileY);
}

export function resolvePlayerHeightOnTowerStep(
  worldX: number,
  worldY: number,
  currentHeight: number,
): number {
  if (!shouldUseLocalizedHeightStacking(worldX, worldY)) {
    return HEIGHT_LEVEL_MIN;
  }

  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);
  const stepLevel = resolveTowerStepHeightAtTile(tileX, tileY);
  if (stepLevel !== null) {
    return stepLevel;
  }

  return clampHeightLevel(currentHeight);
}

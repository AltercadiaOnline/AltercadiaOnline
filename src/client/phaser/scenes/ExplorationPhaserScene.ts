import { DEFAULT_MAP_ID, MAP_REGISTRY, type MapId } from '../../../shared/world/mapRegistry.js';
import { createMapInstancePhaserScene } from './createMapInstancePhaserScene.js';
import type { PhaserWorldSceneBase } from './MainScene.js';

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => PhaserWorldSceneBase;
};

/**
 * @deprecated Use createMapInstancePhaserScene por mapId — mantido para imports legados.
 * Retorna a cena da cidade (instância padrão).
 */
export function createExplorationPhaserScene(Phaser: PhaserNamespace): new () => PhaserWorldSceneBase {
  const cityId = DEFAULT_MAP_ID;
  return createMapInstancePhaserScene(Phaser, cityId);
}

/** Registra uma cena Phaser isolada por mapa. */
export function createAllMapInstancePhaserScenes(
  Phaser: PhaserNamespace,
  mapIds: readonly MapId[] = Object.keys(MAP_REGISTRY) as MapId[],
): Array<new () => PhaserWorldSceneBase> {
  return mapIds.map((mapId) => createMapInstancePhaserScene(Phaser, mapId));
}

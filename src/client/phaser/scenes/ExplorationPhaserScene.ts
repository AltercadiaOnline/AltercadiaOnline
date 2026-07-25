// @ts-nocheck
import { DEFAULT_MAP_ID, MAP_REGISTRY } from '../../../shared/world/mapRegistry.js';
import { createMapInstancePhaserScene } from './createMapInstancePhaserScene.js';
/**
 * @deprecated Use createMapInstancePhaserScene por mapId — mantido para imports legados.
 * Retorna a cena da cidade (instância padrão).
 */
export function createExplorationPhaserScene(Phaser) {
    const cityId = DEFAULT_MAP_ID;
    return createMapInstancePhaserScene(Phaser, cityId);
}
/** Registra uma cena Phaser isolada por mapa. */
export function createAllMapInstancePhaserScenes(Phaser, mapIds = Object.keys(MAP_REGISTRY)) {
    return mapIds.map((mapId) => createMapInstancePhaserScene(Phaser, mapId));
}

// @ts-nocheck
import { MapLoader } from './MapLoader.js';
/**
 * @deprecated Use MapLoader — mantido para compatibilidade de imports legados.
 */
export class PhaserTiledMapController {
    loader = new MapLoader();
    queuePreload(scene, mapId) {
        return this.loader.queuePreload(scene, mapId);
    }
    mount(scene, mapId) {
        const result = this.loader.load(scene, mapId);
        if (!result)
            return null;
        return {
            mapId: result.mapId,
            widthPx: result.widthPx,
            heightPx: result.heightPx,
        };
    }
    load(scene, mapId) {
        return this.loader.load(scene, mapId);
    }
    getCollisionLayer() {
        return this.loader.getCollisionLayer();
    }
    getMapPixelSize() {
        return this.loader.getMapPixelSize();
    }
    getObjectByUid(uid) {
        return this.loader.getObjectByUid(uid);
    }
    getPlayerSpawn() {
        return this.loader.getPlayerSpawn();
    }
    listObjects() {
        return this.loader.listObjects();
    }
    isMounted(mapId) {
        return this.loader.isMounted(mapId);
    }
    destroy() {
        this.loader.destroy();
    }
}
export function queueTiledMapPreload(scene, mapId) {
    return new MapLoader().queuePreload(scene, mapId);
}
export { MapLoader };

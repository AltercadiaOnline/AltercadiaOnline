// @ts-nocheck
const DEBUG_LABEL_STYLE = {
    fontFamily: 'monospace',
    fontSize: '9px',
    color: '#f0f4ff',
    backgroundColor: '#080a12cc',
    padding: { x: 3, y: 2 },
};
export function createDebugLabelStyle() {
    return { ...DEBUG_LABEL_STYLE };
}
/**
 * Agrupa camadas de layout — câmera do Phaser scrolla o mundo; containers ficam em (0,0).
 * `mapContainer` desenha primeiro; `ySortContainer` compartilha depth por coordenada Y dos pés.
 */
export function mountPhaserLayoutRoots(scene) {
    const worldRoot = scene.add.container(0, 0);
    const mapContainer = scene.add.container(0, 0);
    const ySortContainer = scene.add.container(0, 0);
    mapContainer.setDepth(0);
    ySortContainer.setDepth(0);
    worldRoot.add(mapContainer);
    worldRoot.add(ySortContainer);
    return {
        worldRoot,
        mapContainer,
        ySortContainer,
    };
}
export function destroyPhaserLayoutRoots(roots) {
    roots?.worldRoot.destroy();
}
/**
 * preload() — registra chaves de terreno (paths em /assets/terrain/).
 */
export function queueTerrainLayoutPreloads(scene, assets) {
    for (const asset of assets) {
        if (!asset.path)
            continue;
        scene.load.image(asset.key, asset.path);
    }
}
/**
 * preload() — registra chaves de estruturas.
 * Game Designer: adicione entradas em MapConfig.structureAssets ou WORLD_ASSET_IMAGE_URLS.
 */
export function queueStructureLayoutPreloads(scene, assets) {
    for (const asset of assets) {
        if (!asset.path)
            continue;
        scene.load.image(asset.key, asset.path);
    }
}

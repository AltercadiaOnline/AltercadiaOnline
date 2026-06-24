import type { StructureAssetDescriptor, TerrainAssetDescriptor } from './MapConfig.js';

export type PhaserLayoutContainer = {
  readonly x: number;
  readonly y: number;
  add: (child: unknown) => PhaserLayoutContainer;
  setPosition: (x: number, y: number) => PhaserLayoutContainer;
  setDepth: (depth: number) => PhaserLayoutContainer;
  setVisible: (visible: boolean) => PhaserLayoutContainer;
  destroy: () => void;
};

export type PhaserLayoutRectangle = {
  setPosition: (x: number, y: number) => PhaserLayoutRectangle;
  setOrigin: (x: number, y: number) => PhaserLayoutRectangle;
  setSize: (width: number, height: number) => PhaserLayoutRectangle;
  setFillStyle: (color: number, alpha?: number) => PhaserLayoutRectangle;
  setStrokeStyle: (lineWidth: number, color: number, alpha?: number) => PhaserLayoutRectangle;
  setDepth: (depth: number) => PhaserLayoutRectangle;
  setVisible: (visible: boolean) => PhaserLayoutRectangle;
  destroy: () => void;
};

export type PhaserLayoutText = {
  setPosition: (x: number, y: number) => PhaserLayoutText;
  setOrigin: (x: number, y: number) => PhaserLayoutText;
  setText: (value: string) => PhaserLayoutText;
  setDepth: (depth: number) => PhaserLayoutText;
  setVisible: (visible: boolean) => PhaserLayoutText;
  destroy: () => void;
};

export type PhaserLayoutImage = {
  setPosition: (x: number, y: number) => PhaserLayoutImage;
  setOrigin: (x: number, y: number) => PhaserLayoutImage;
  setCrop: (x: number, y: number, width: number, height: number) => PhaserLayoutImage;
  setDepth: (depth: number) => PhaserLayoutImage;
  setDisplaySize: (width: number, height: number) => PhaserLayoutImage;
  setTexture: (textureKey: string) => PhaserLayoutImage;
  setVisible: (visible: boolean) => PhaserLayoutImage;
  destroy: () => void;
};

/** Superfície Phaser mínima para controllers de layout (sem import estático de phaser). */
export type PhaserLayoutScene = {
  readonly textures: {
    exists: (key: string) => boolean;
    addImage: (key: string, source: HTMLImageElement) => unknown;
    get: (key: string) => { setFilter: (mode: number) => void };
  };
  readonly load: {
    image: (key: string, url: string) => void;
  };
  readonly add: {
    container: (x: number, y: number) => PhaserLayoutContainer;
    rectangle: (
      x: number,
      y: number,
      width: number,
      height: number,
      fillColor?: number,
    ) => PhaserLayoutRectangle;
    text: (
      x: number,
      y: number,
      content: string,
      style?: Record<string, unknown>,
    ) => PhaserLayoutText;
    image: (x: number, y: number, textureKey: string) => PhaserLayoutImage;
  };
};

export type PhaserLayoutRoots = {
  readonly worldRoot: PhaserLayoutContainer;
  readonly mapContainer: PhaserLayoutContainer;
  readonly structuresContainer: PhaserLayoutContainer;
  readonly actorsContainer: PhaserLayoutContainer;
};

const DEBUG_LABEL_STYLE = {
  fontFamily: 'monospace',
  fontSize: '9px',
  color: '#f0f4ff',
  backgroundColor: '#080a12cc',
  padding: { x: 3, y: 2 },
} as const;

export function createDebugLabelStyle(): Record<string, unknown> {
  return { ...DEBUG_LABEL_STYLE };
}

/**
 * Agrupa camadas de layout — câmera do Phaser scrolla o mundo; containers ficam em (0,0).
 * Game Designer: não precisa mover containers; use coordenadas de mundo nos filhos.
 */
export function mountPhaserLayoutRoots(scene: PhaserLayoutScene): PhaserLayoutRoots {
  const worldRoot = scene.add.container(0, 0);
  const mapContainer = scene.add.container(0, 0);
  const structuresContainer = scene.add.container(0, 0);
  const actorsContainer = scene.add.container(0, 0);

  mapContainer.setDepth(0);
  structuresContainer.setDepth(100);
  actorsContainer.setDepth(200);

  worldRoot.add(mapContainer);
  worldRoot.add(structuresContainer);
  worldRoot.add(actorsContainer);

  return {
    worldRoot,
    mapContainer,
    structuresContainer,
    actorsContainer,
  };
}

export function destroyPhaserLayoutRoots(roots: PhaserLayoutRoots | null): void {
  roots?.worldRoot.destroy();
}

/**
 * preload() — registra chaves de terreno.
 * Game Designer: adicione entradas em MapConfig.terrainAssets com key + path do PNG.
 */
export function queueTerrainLayoutPreloads(
  scene: PhaserLayoutScene,
  assets: readonly TerrainAssetDescriptor[],
): void {
  for (const asset of assets) {
    if (!asset.path) continue;
    scene.load.image(asset.key, asset.path);
  }
}

/**
 * preload() — registra chaves de estruturas.
 * Game Designer: adicione entradas em MapConfig.structureAssets ou WORLD_ASSET_IMAGE_URLS.
 */
export function queueStructureLayoutPreloads(
  scene: PhaserLayoutScene,
  assets: readonly StructureAssetDescriptor[],
): void {
  for (const asset of assets) {
    if (!asset.path) continue;
    scene.load.image(asset.key, asset.path);
  }
}

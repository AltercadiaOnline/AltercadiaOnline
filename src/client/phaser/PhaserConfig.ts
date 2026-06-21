import { DESIGN_CONFIG } from '../../config/designConstants.js';

/** Cena raiz (esqueleto) — filhas especializam exploração/combate. */
export const PHASER_MAIN_SCENE_KEY = 'MainScene';

/** Cena ativa de exploração online. */
export const PHASER_EXPLORATION_SCENE_KEY = 'ExplorationWorld';

export const PHASER_RUNTIME_CONFIG = {
  width: DESIGN_CONFIG.VIEWPORT.WIDTH,
  height: DESIGN_CONFIG.VIEWPORT.HEIGHT,
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
} as const;

/** Canvas transparente — React HUD sobrepõe via z-index. */
export const PHASER_CANVAS_STYLE =
  'display:block;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;background:transparent;';

export const PHASER_MOUNT_ROOT_ID = 'phaser-mount-root';

export const CANVAS_LEGACY_ID = 'game-canvas';

export const GAME_RENDER_HOST_ID = 'game-render-host';

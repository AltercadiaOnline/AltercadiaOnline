import { DESIGN_CONFIG } from '../../config/designConstants.js';

export const PHASER_EXPLORATION_SCENE_KEY = 'ExplorationWorld';

export const PHASER_RUNTIME_CONFIG = {
  width: DESIGN_CONFIG.VIEWPORT.WIDTH,
  height: DESIGN_CONFIG.VIEWPORT.HEIGHT,
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  backgroundColor: '#05080a',
} as const;

export const PHASER_MOUNT_ROOT_ID = 'phaser-mount-root';

export const CANVAS_LEGACY_ID = 'game-canvas';

export const GAME_RENDER_HOST_ID = 'game-render-host';

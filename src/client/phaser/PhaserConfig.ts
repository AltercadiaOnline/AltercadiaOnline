import { GAME_CONFIG } from '../../game/constants/GameConfig.js';

/** Cena raiz (esqueleto) — filhas especializam exploração/combate. */
export const PHASER_MAIN_SCENE_KEY = 'MainScene';

/** Cena ativa de exploração online. */
export const PHASER_EXPLORATION_SCENE_KEY = 'ExplorationWorld';

/** Cena de arena de combate (Phaser). */
export const PHASER_BATTLE_SCENE_KEY = 'BattleArena';

/** Mediadora de carregamento entre instâncias de mapa (Phaser). */
export const PHASER_MAP_LOADING_SCENE_KEY = 'MapInstanceLoading';

/** Pré-carregamento global (atlas Road2 + criaturas) antes da LoadingScene. */
export const PHASER_PRELOADER_SCENE_KEY = 'PreloaderScene';

/** Coluna de render compartilhada — filha direta de #game-container. */
export const GAME_RENDER_COLUMN_ID = 'game-render-column';

export const PHASER_RUNTIME_CONFIG = {
  width: GAME_CONFIG.VIEWPORT_WIDTH,
  height: GAME_CONFIG.VIEWPORT_HEIGHT,
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
} as const;

/** Canvas transparente — React HUD sobrepõe via z-index. */
export const PHASER_CANVAS_STYLE =
  'display:block;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;background:transparent;';

export const PHASER_MOUNT_ROOT_ID = 'phaser-mount-root';

/** Superfície de input do mundo — host Phaser (sem canvas legado). */
export const GAME_WORLD_INPUT_SURFACE_ID = PHASER_MOUNT_ROOT_ID;

export const GAME_RENDER_HOST_ID = 'game-render-host';

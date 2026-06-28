import { GAME_CONFIG } from '../../game/constants/GameConfig.js';
import { PHASER_CANVAS_STYLE, PHASER_RUNTIME_CONFIG } from './PhaserConfig.js';

type PhaserScaleNamespace = {
  FIT: number;
  CENTER_BOTH: number;
};

export type PhaserGameConfigDeps = {
  readonly Phaser: {
    AUTO: number;
    Scale: PhaserScaleNamespace;
  };
  readonly parent: HTMLElement;
  readonly scenes: unknown[];
};

/**
 * Config canônica do Phaser (v4 no projeto; equivalente ao gameConfig Phaser 3).
 *
 * Phaser 3 agrupava `pixelArt` / `antialias` em `render: {}`.
 * Phaser 4 expõe os mesmos flags no topo do GameConfig — valores idênticos para pixel-perfect.
 */
export function buildPhaserGameConfig(deps: PhaserGameConfigDeps): Record<string, unknown> {
  const { width, height } = PHASER_RUNTIME_CONFIG;

  return {
    type: deps.Phaser.AUTO,
    parent: deps.parent,
    width,
    height,
    title: 'Altercadia Online',
    transparent: true,
    clearBeforeRender: true,
    canvasStyle: PHASER_CANVAS_STYLE,
    // Equivalente a render: { pixelArt: true, antialias: false, roundPixels: true }
    pixelArt: PHASER_RUNTIME_CONFIG.pixelArt,
    antialias: PHASER_RUNTIME_CONFIG.antialias,
    antialiasGL: PHASER_RUNTIME_CONFIG.antialiasGL,
    roundPixels: PHASER_RUNTIME_CONFIG.roundPixels,
    scale: {
      mode: deps.Phaser.Scale.FIT,
      autoCenter: deps.Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
    scene: deps.scenes,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
  };
}

export const PHASER_DESIGN_VIEWPORT = {
  width: GAME_CONFIG.VIEWPORT_WIDTH,
  height: GAME_CONFIG.VIEWPORT_HEIGHT,
} as const;

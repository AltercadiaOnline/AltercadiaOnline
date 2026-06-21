import { DESIGN_CONFIG } from '../../../config/designConstants.js';

const { WIDTH, HEIGHT } = DESIGN_CONFIG.VIEWPORT;

/** Layout side-view 640×360 — espelha `.battle-arena` / `.battle-platform` do DOM. */
export const BATTLE_PHASER_ARENA_LAYOUT = {
  width: WIDTH,
  height: HEIGHT,
  floorTopY: Math.round(HEIGHT * 0.72),
  allyPlatformX: 168,
  foePlatformX: 472,
  platformBaseY: HEIGHT - 14,
  platformEllipseWidth: 200,
  platformEllipseHeight: 22,
  fighterMaxHeight: 220,
  fighterDepth: 12,
  platformDepth: 4,
  floorDepth: 0,
  ambientDepth: 1,
} as const;

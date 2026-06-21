import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';

export type PhaserVfxPosition = {
  readonly x: number;
  readonly y: number;
};

/** Centro do torso side-view — espelha `portraitCenter` do DOM. */
export function resolvePhaserFighterAnchor(side: 'ally' | 'foe'): PhaserVfxPosition {
  const layout = BATTLE_PHASER_ARENA_LAYOUT;
  return {
    x: side === 'ally' ? layout.allyPlatformX : layout.foePlatformX,
    y: layout.platformBaseY - Math.round(layout.fighterMaxHeight * 0.55),
  };
}

// @ts-nocheck
import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';
/** Centro do torso side-view — espelha `portraitCenter` do DOM. */
export function resolvePhaserFighterAnchor(side) {
    const layout = BATTLE_PHASER_ARENA_LAYOUT;
    return {
        x: side === 'ally' ? layout.allyPlatformX : layout.foePlatformX,
        y: layout.platformBaseY - Math.round(layout.fighterMaxHeight * 0.55),
    };
}

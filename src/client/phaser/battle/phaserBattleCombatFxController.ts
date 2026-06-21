import type { BattleCombatCue } from '../../app/bridge/battleRenderBridge.js';
import type { PhaserSceneGraphics } from '../scenes/MainScene.js';
import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';

type FxSlot = 'ally' | 'foe';

const CUE_COLORS: Record<BattleCombatCue, number> = {
  attack: 0xffffff,
  hit: 0xffffff,
  rune: 0xc77dff,
  heal: 0x3fb950,
  shield: 0x58a6ff,
};

export class PhaserBattleCombatFxController {
  private readonly overlays = new Map<FxSlot, PhaserSceneGraphics>();

  mount(scene: { add: { graphics: () => PhaserSceneGraphics } }): void {
    for (const slot of ['ally', 'foe'] as const) {
      const overlay = scene.add.graphics();
      overlay.setDepth(BATTLE_PHASER_ARENA_LAYOUT.fighterDepth + 3);
      this.overlays.set(slot, overlay);
    }
  }

  applyCues(allyCue: BattleCombatCue | null, foeCue: BattleCombatCue | null): void {
    this.paintCue('ally', allyCue, BATTLE_PHASER_ARENA_LAYOUT.allyPlatformX);
    this.paintCue('foe', foeCue, BATTLE_PHASER_ARENA_LAYOUT.foePlatformX);
  }

  destroy(): void {
    for (const overlay of this.overlays.values()) {
      overlay.destroy();
    }
    this.overlays.clear();
  }

  private paintCue(slot: FxSlot, cue: BattleCombatCue | null, centerX: number): void {
    const overlay = this.overlays.get(slot);
    if (!overlay) return;

    overlay.clear();
    if (!cue) return;

    const topY =
      BATTLE_PHASER_ARENA_LAYOUT.platformBaseY - BATTLE_PHASER_ARENA_LAYOUT.fighterMaxHeight;
    const height = BATTLE_PHASER_ARENA_LAYOUT.fighterMaxHeight;
    const width = 96;
    const color = CUE_COLORS[cue];
    const alpha = cue === 'hit' ? 0.42 : cue === 'shield' ? 0.28 : 0.22;

    overlay.fillStyle(color, alpha);
    overlay.fillRect(centerX - width / 2, topY, width, height);

    if (cue === 'shield') {
      overlay.lineStyle(2, 0x58a6ff, 0.75);
      overlay.strokeRect(centerX - width / 2 - 2, topY - 2, width + 4, height + 4);
    }
  }
}

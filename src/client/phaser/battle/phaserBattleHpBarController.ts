// @ts-nocheck
import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';
const BAR_WIDTH = 72;
const BAR_HEIGHT = 5;
const BAR_OFFSET_Y = 12;
export class PhaserBattleHpBarController {
    bars = new Map();
    scene = null;
    mount(scene) {
        this.scene = scene;
        for (const slot of ['ally', 'foe']) {
            const bar = scene.add.graphics();
            bar.setDepth(BATTLE_PHASER_ARENA_LAYOUT.fighterDepth + 2);
            this.bars.set(slot, bar);
        }
    }
    applyVitals(ally, foe) {
        this.paintBar('ally', ally, BATTLE_PHASER_ARENA_LAYOUT.allyPlatformX);
        this.paintBar('foe', foe, BATTLE_PHASER_ARENA_LAYOUT.foePlatformX);
    }
    destroy() {
        for (const bar of this.bars.values()) {
            bar.destroy();
        }
        this.bars.clear();
        this.scene = null;
    }
    paintBar(slot, vitals, centerX) {
        const bar = this.bars.get(slot);
        if (!bar)
            return;
        bar.clear();
        if (!vitals)
            return;
        const topY = BATTLE_PHASER_ARENA_LAYOUT.platformBaseY
            - BATTLE_PHASER_ARENA_LAYOUT.fighterMaxHeight
            - BAR_OFFSET_Y;
        const leftX = centerX - BAR_WIDTH / 2;
        const fillWidth = Math.max(0, Math.round(BAR_WIDTH * vitals.hpRatio));
        bar.fillStyle(0x21262d, 0.95);
        bar.fillRect(leftX, topY, BAR_WIDTH, BAR_HEIGHT);
        bar.fillStyle(vitals.hpRatio > 0.25 ? 0x3fb950 : 0xf85149, 1);
        bar.fillRect(leftX, topY, fillWidth, BAR_HEIGHT);
        bar.lineStyle(1, 0x82b0c4, 0.35);
        bar.strokeRect(leftX, topY, BAR_WIDTH, BAR_HEIGHT);
        if (vitals.statusCount > 0) {
            const dotX = leftX + BAR_WIDTH + 4;
            bar.fillStyle(0x58a6ff, 0.9);
            bar.fillCircle(dotX, topY + BAR_HEIGHT / 2, 3);
        }
    }
}

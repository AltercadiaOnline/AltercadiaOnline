// @ts-nocheck
import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';
import { ensureBattlePlaceholderTexture } from './phaserBattlePlaceholderTexture.js';
import { ensureBattleSpriteTexture } from './phaserBattleTextureLoader.js';
export class PhaserBattleFighterController {
    side;
    anchorX;
    anchorY;
    scene = null;
    sprite = null;
    boundTextureKey = null;
    constructor(side, anchorX, anchorY) {
        this.side = side;
        this.anchorX = anchorX;
        this.anchorY = anchorY;
    }
    mount(scene) {
        this.scene = scene;
    }
    async applySlot(slot) {
        if (!this.scene)
            return;
        // Sem combatente algum no slot → esconde. Com combatente mas sem PNG →
        // silhueta procedural (nunca deixa buraco visual no protótipo).
        const hasCombatant = Boolean(slot.spriteSrc || slot.creatureId || slot.monsterId);
        if (!hasCombatant) {
            this.sprite?.setVisible(false);
            return;
        }
        let textureKey = slot.spriteSrc
            ? await ensureBattleSpriteTexture(this.scene.textures, slot.spriteSrc, slot.spriteSrcFallbacks)
            : null;
        if (!textureKey) {
            const seed = slot.creatureId ?? slot.monsterId ?? slot.label ?? this.side;
            textureKey = ensureBattlePlaceholderTexture(this.scene.textures, seed, this.side);
        }
        if (!textureKey) {
            this.sprite?.setVisible(false);
            return;
        }
        if (!this.sprite || this.boundTextureKey !== textureKey) {
            this.sprite?.destroy();
            this.sprite = this.scene.add.image(this.anchorX, this.anchorY, textureKey);
            this.sprite.setOrigin(0.5, 1);
            this.boundTextureKey = textureKey;
        }
        this.fitSpriteToArena(this.sprite);
        this.sprite.setPosition(this.anchorX, this.anchorY);
        this.sprite.setDepth(BATTLE_PHASER_ARENA_LAYOUT.fighterDepth);
        this.sprite.setVisible(true);
    }
    destroy() {
        this.sprite?.destroy();
        this.sprite = null;
        this.boundTextureKey = null;
        this.scene = null;
    }
    fitSpriteToArena(sprite) {
        const maxHeight = BATTLE_PHASER_ARENA_LAYOUT.fighterMaxHeight;
        const naturalHeight = sprite.height;
        const naturalWidth = sprite.width;
        if (naturalHeight <= 0 || naturalWidth <= 0)
            return;
        const scale = Math.min(1, maxHeight / naturalHeight);
        sprite.setDisplaySize(Math.round(naturalWidth * scale), Math.round(naturalHeight * scale));
    }
}

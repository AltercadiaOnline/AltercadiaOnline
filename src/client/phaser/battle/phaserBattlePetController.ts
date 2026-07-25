// @ts-nocheck
import { renderPetPortrait } from '../../entities/pet/petRenderer.js';
import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
const PET_TEXTURE_PREFIX = 'battle-phaser-pet';
const PET_DISPLAY_SIZE = 52;
export class PhaserBattlePetController {
    scene = null;
    sprite = null;
    lastSignature = null;
    mount(scene) {
        this.scene = scene;
    }
    applyPet(pet) {
        if (!this.scene)
            return;
        if (!pet.visible || !pet.kindId || !pet.colorId) {
            this.sprite?.setVisible(false);
            return;
        }
        const signature = `${pet.kindId}:${pet.colorId}`;
        const textureKey = `${PET_TEXTURE_PREFIX}:${signature}`;
        if (signature !== this.lastSignature || !this.scene.textures.exists(textureKey)) {
            this.refreshTexture(textureKey, pet.kindId, pet.colorId);
            this.lastSignature = signature;
        }
        if (!this.sprite) {
            this.sprite = this.scene.add.image(0, 0, textureKey);
            this.sprite.setOrigin(0.5, 1);
            this.sprite.setDisplaySize(PET_DISPLAY_SIZE, PET_DISPLAY_SIZE);
            this.sprite.setDepth(BATTLE_PHASER_ARENA_LAYOUT.fighterDepth - 1);
        }
        const x = BATTLE_PHASER_ARENA_LAYOUT.allyPlatformX - 58;
        const y = BATTLE_PHASER_ARENA_LAYOUT.platformBaseY - 8;
        this.sprite.setPosition(x, y);
        this.sprite.setVisible(true);
    }
    destroy() {
        this.sprite?.destroy();
        this.sprite = null;
        this.scene = null;
        this.lastSignature = null;
    }
    refreshTexture(textureKey, kindId, colorId) {
        if (!this.scene)
            return;
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        renderPetPortrait(ctx, kindId, colorId, 96);
        this.scene.textures.addCanvas(textureKey, canvas);
        try {
            this.scene.textures.get(textureKey).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
        }
        catch {
            /* noop */
        }
        this.sprite?.destroy();
        this.sprite = null;
    }
}

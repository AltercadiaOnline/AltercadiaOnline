// @ts-nocheck
import { resolveBattleArenaBackdropUrl } from './battleArenaBackdrop.js';
import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';
import { PhaserBattleCombatFxController } from './phaserBattleCombatFxController.js';
import { PhaserBattleFighterController } from './phaserBattleFighterController.js';
import { PhaserBattlePetController } from './phaserBattlePetController.js';
import { PhaserBattleVfxController, registerPhaserBattleVfxController, } from './phaserBattleVfxController.js';
import { clearBattleTextureImageCache, ensureBattleSpriteTexture, } from './phaserBattleTextureLoader.js';
/** Chão, plataformas, sprites, vitals, projéteis e FX da arena Phaser. */
export class PhaserBattleArenaController {
    scene = null;
    allyFighter;
    foeFighter;
    pet = new PhaserBattlePetController();
    combatFx = new PhaserBattleCombatFxController();
    vfx = new PhaserBattleVfxController();
    staticLayers = [];
    backgroundImage = null;
    backgroundUrl = null;
    lastFrame = null;
    pendingApply = Promise.resolve();
    constructor() {
        const layout = BATTLE_PHASER_ARENA_LAYOUT;
        this.allyFighter = new PhaserBattleFighterController('ally', layout.allyPlatformX, layout.platformBaseY);
        this.foeFighter = new PhaserBattleFighterController('foe', layout.foePlatformX, layout.platformBaseY);
    }
    mount(scene) {
        this.scene = scene;
        this.allyFighter.mount(scene);
        this.foeFighter.mount(scene);
        this.pet.mount(scene);
        this.combatFx.mount(scene);
        this.vfx.mount(scene);
        registerPhaserBattleVfxController(this.vfx);
        this.paintStaticArena(scene);
        this.backgroundUrl = resolveBattleArenaBackdropUrl(this.lastFrame?.monsterId ?? null);
        void this.paintBackgroundImage(scene, this.backgroundUrl);
        if (this.lastFrame) {
            void this.applyFrame(this.lastFrame);
        }
    }
    applyFrame(frame) {
        this.lastFrame = frame;
        // Mesmo oponente → mesma arena; troca o cenário se o adversário mudar.
        if (this.scene) {
            const desiredUrl = resolveBattleArenaBackdropUrl(frame.monsterId);
            if (desiredUrl !== this.backgroundUrl) {
                this.backgroundUrl = desiredUrl;
                void this.paintBackgroundImage(this.scene, desiredUrl);
            }
        }
        this.pendingApply = this.pendingApply
            .then(async () => {
            await this.allyFighter.applySlot(frame.ally);
            await this.foeFighter.applySlot(frame.foe);
            this.pet.applyPet(frame.pet);
            this.combatFx.applyCues(frame.allyCue, frame.foeCue);
        })
            .catch((error) => {
            console.warn('[PhaserBattleArena] Falha ao aplicar frame:', error);
        });
    }
    destroy() {
        for (const layer of this.staticLayers) {
            layer.destroy();
        }
        this.staticLayers = [];
        this.backgroundImage?.destroy();
        this.backgroundImage = null;
        this.backgroundUrl = null;
        this.allyFighter.destroy();
        this.foeFighter.destroy();
        this.pet.destroy();
        this.combatFx.destroy();
        this.vfx.destroy();
        registerPhaserBattleVfxController(null);
        this.scene = null;
        this.lastFrame = null;
        clearBattleTextureImageCache();
    }
    paintStaticArena(scene) {
        const { width, height, floorTopY, allyPlatformX, foePlatformX, platformBaseY, platformEllipseWidth, floorDepth, ambientDepth, platformDepth, } = BATTLE_PHASER_ARENA_LAYOUT;
        const platformRadiusX = platformEllipseWidth / 2;
        // Fallback sólido — fica atrás do cenário PNG (depth menor) e evita flash
        // enquanto a imagem carrega.
        const backdrop = scene.add.graphics();
        backdrop.fillStyle(0x060806, 1);
        backdrop.fillRect(0, 0, width, height);
        backdrop.setDepth(floorDepth - 1);
        // Piso translúcido — escurece levemente a base para contraste dos lutadores
        // sem ocultar a calçada do cenário urbano.
        const floor = scene.add.graphics();
        floor.fillStyle(0x081218, 0.3);
        floor.fillRect(0, floorTopY, width, height - floorTopY);
        floor.fillStyle(0x5efcff, 0.08);
        floor.fillRect(0, floorTopY, width, 2);
        floor.setDepth(floorDepth + 0.1);
        const ambient = scene.add.graphics();
        ambient.fillStyle(0x5efcff, 0.12);
        ambient.fillCircle(width * 0.2, height * 0.35, width * 0.17);
        ambient.fillStyle(0xffb347, 0.14);
        ambient.fillCircle(width * 0.78, height * 0.26, width * 0.15);
        ambient.setDepth(ambientDepth);
        const platforms = scene.add.graphics();
        for (const x of [allyPlatformX, foePlatformX]) {
            platforms.fillStyle(0x000000, 0.55);
            platforms.fillCircle(x, platformBaseY + 8, platformRadiusX * 0.85);
            platforms.fillStyle(0x5efcff, 0.22);
            platforms.fillCircle(x, platformBaseY, platformRadiusX);
            platforms.lineStyle(1, 0x82b0c4, 0.28);
            platforms.strokeRect(x - platformRadiusX, platformBaseY - 11, platformEllipseWidth, 22);
        }
        platforms.setDepth(platformDepth);
        this.staticLayers = [backdrop, floor, ambient, platforms];
    }
    /** Carrega e posiciona o cenário urbano atrás de tudo (acima do fallback sólido). */
    async paintBackgroundImage(scene, url) {
        const key = await ensureBattleSpriteTexture(scene.textures, url);
        if (!key || this.scene !== scene) {
            return;
        }
        const { width, height, floorDepth } = BATTLE_PHASER_ARENA_LAYOUT;
        this.backgroundImage?.destroy();
        const image = scene.add.image(0, 0, key);
        image.setOrigin(0, 0);
        image.setDisplaySize(width, height);
        image.setDepth(floorDepth - 0.5);
        this.backgroundImage = image;
    }
}

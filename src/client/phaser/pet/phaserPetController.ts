// @ts-nocheck
import { renderPetSprite } from '../../entities/pet/petRenderer.js';
import { getPetFeetWorldY, getPetVisualBounds } from '../../../shared/world/petEntity.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
import { resolvePhaserWorldDepth } from '../layout/phaserWorldDepth.js';
const PET_TEXTURE_KEY = 'altercadia-pet-follow';
/**
 * Pet top-down no Phaser — canvas procedural espelhando `renderPetSprite`.
 */
export class PhaserPetController {
    sprite = null;
    scene = null;
    ySortContainer = null;
    canvas = null;
    lastDrawKey = '';
    mount(scene, ySortContainer) {
        this.scene = scene;
        this.ySortContainer = ySortContainer ?? null;
    }
    sync(snapshot, timestampMs) {
        const scene = this.scene;
        if (!scene || !snapshot?.visible) {
            this.sprite?.setVisible(false);
            return;
        }
        const bounds = getPetVisualBounds(snapshot);
        const feetX = Math.floor(snapshot.x);
        const feetY = Math.floor(getPetFeetWorldY(snapshot));
        const drawKey = `${snapshot.kindId}:${snapshot.colorId}:${snapshot.gender}:${Math.floor(snapshot.animPhase * 4)}:${Math.floor(timestampMs / 32)}`;
        void this.ensureTexture(scene, snapshot, bounds, timestampMs, drawKey).then((ready) => {
            if (!ready) {
                this.sprite?.setVisible(false);
                return;
            }
            if (!this.sprite) {
                this.sprite = scene.add.image(feetX, feetY, PET_TEXTURE_KEY);
                this.sprite.setOrigin(0.5, 1);
                this.ySortContainer?.add(this.sprite);
            }
            this.sprite.setPosition(feetX, feetY);
            this.sprite.setDisplaySize(bounds.width, bounds.height);
            this.sprite.setDepth(resolvePhaserWorldDepth(feetY));
            this.sprite.setVisible(true);
        });
    }
    destroy() {
        this.sprite?.destroy();
        this.sprite = null;
        this.canvas = null;
        this.lastDrawKey = '';
        this.scene = null;
        this.ySortContainer = null;
    }
    async ensureTexture(scene, snapshot, bounds, timestampMs, drawKey) {
        if (typeof document === 'undefined') {
            return false;
        }
        if (drawKey === this.lastDrawKey && scene.textures.exists(PET_TEXTURE_KEY)) {
            return true;
        }
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
        }
        const canvas = this.canvas;
        canvas.width = Math.max(1, Math.round(bounds.width));
        canvas.height = Math.max(1, Math.round(bounds.height));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return false;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(-bounds.x, -bounds.y);
        renderPetSprite(ctx, snapshot, timestampMs);
        ctx.restore();
        const img = await canvasToImage(canvas);
        if (scene.textures.exists(PET_TEXTURE_KEY)) {
            scene.textures.remove(PET_TEXTURE_KEY);
        }
        scene.textures.addImage(PET_TEXTURE_KEY, img);
        try {
            scene.textures.get(PET_TEXTURE_KEY).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
        }
        catch {
            /* noop */
        }
        this.lastDrawKey = drawKey;
        return true;
    }
}
function canvasToImage(canvas) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = canvas.toDataURL('image/png');
    });
}

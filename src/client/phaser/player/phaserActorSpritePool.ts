// @ts-nocheck
const DEFAULT_POOL_CAPACITY = 50;
/**
 * Pool de sprites de atores (NPC/criatura) — evita destroy/create no meio da exploração.
 */
export class PhaserActorSpritePool {
    maxSize;
    available = [];
    constructor(maxSize = DEFAULT_POOL_CAPACITY) {
        this.maxSize = maxSize;
    }
    acquire(factory) {
        const pooled = this.available.pop();
        if (pooled) {
            pooled.setVisible(true);
            pooled.setAlpha(1);
            return pooled;
        }
        return factory();
    }
    release(sprite) {
        sprite.setVisible(false);
        sprite.setAlpha(0);
        if (this.available.length >= this.maxSize) {
            sprite.destroy();
            return;
        }
        this.available.push(sprite);
    }
    drain() {
        while (this.available.length > 0) {
            this.available.pop()?.destroy();
        }
    }
    getPooledCount() {
        return this.available.length;
    }
}

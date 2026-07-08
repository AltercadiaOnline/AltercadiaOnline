type PoolableActorSprite = {
  setVisible: (visible: boolean) => PoolableActorSprite;
  setAlpha: (alpha: number) => PoolableActorSprite;
  destroy: () => void;
};

const DEFAULT_POOL_CAPACITY = 50;

/**
 * Pool de sprites de atores (NPC/criatura) — evita destroy/create no meio da exploração.
 */
export class PhaserActorSpritePool<TSprite extends PoolableActorSprite> {
  private readonly available: TSprite[] = [];

  constructor(private readonly maxSize: number = DEFAULT_POOL_CAPACITY) {}

  acquire(factory: () => TSprite): TSprite {
    const pooled = this.available.pop();
    if (pooled) {
      pooled.setVisible(true);
      pooled.setAlpha(1);
      return pooled;
    }
    return factory();
  }

  release(sprite: TSprite): void {
    sprite.setVisible(false);
    sprite.setAlpha(0);
    if (this.available.length >= this.maxSize) {
      sprite.destroy();
      return;
    }
    this.available.push(sprite);
  }

  drain(): void {
    while (this.available.length > 0) {
      this.available.pop()?.destroy();
    }
  }

  getPooledCount(): number {
    return this.available.length;
  }
}

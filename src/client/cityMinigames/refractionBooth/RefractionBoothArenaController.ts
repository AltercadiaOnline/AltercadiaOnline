import { REFRACTION_BOOTH_DUCK_SPAWN } from '../../../shared/cityMinigames/refractionBoothConfig.js';
import { DuckEntity } from './DuckEntity.js';
import { createHitSpark, pruneHitSparks, renderHitSparks, type HitSpark } from './HitEffect.js';
import { SpawnManager } from './SpawnManager.js';
import type { TargetEntity, TargetFactory } from './TargetEntity.js';

export type RefractionBoothArenaCallbacks = {
  readonly onHit: () => void;
  readonly onMiss: () => void;
};

export type RefractionBoothArenaControllerOptions = RefractionBoothArenaCallbacks & {
  readonly targetFactory?: TargetFactory;
};

/**
 * Loop de jogo Duck Hunt — canvas, spawn, colisão por frame e efeitos visuais.
 */
export class RefractionBoothArenaController {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly callbacks: RefractionBoothArenaCallbacks;
  private readonly targetFactory: TargetFactory;
  private readonly entities = new Map<number, TargetEntity>();
  private readonly sparks: HitSpark[] = [];
  private readonly spawnManager: SpawnManager;
  private nextEntityId = 1;
  private animationFrameId: number | null = null;
  private lastFrameMs = 0;
  private running = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    mount: HTMLElement,
    options: RefractionBoothArenaControllerOptions,
  ) {
    this.callbacks = options;
    this.targetFactory = options.targetFactory ?? ((id) => new DuckEntity(id));

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'refraction-booth__arena-canvas';
    this.canvas.setAttribute('aria-label', 'Arena do simulador de tiro');
    mount.innerHTML = '';
    mount.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D indisponível.');
    }
    this.ctx = ctx;

    this.spawnManager = new SpawnManager({
      spawnMinMs: REFRACTION_BOOTH_DUCK_SPAWN.spawnMinMs,
      spawnMaxMs: REFRACTION_BOOTH_DUCK_SPAWN.spawnMaxMs,
      maxConcurrent: REFRACTION_BOOTH_DUCK_SPAWN.maxConcurrentTargets,
      getActiveCount: () => this.countAliveEntities(),
      onSpawn: () => this.spawnEntity(),
    });

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(mount);
    this.resizeCanvas();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameMs = performance.now();
    this.spawnManager.start();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    this.spawnManager.stop();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.entities.clear();
    this.sparks.length = 0;
    this.drawFrame(performance.now());
  }

  destroy(): void {
    this.stop();
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas.remove();
  }

  private countAliveEntities(): number {
    let count = 0;
    for (const entity of this.entities.values()) {
      if (entity.state === 'alive') count += 1;
    }
    return count;
  }

  private spawnEntity(): void {
    const id = this.nextEntityId++;
    this.entities.set(id, this.targetFactory(id));
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.running) return;

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const normX = (event.clientX - rect.left) / rect.width;
    const normY = (event.clientY - rect.top) / rect.height;
    const nowMs = performance.now();

    for (const entity of this.entities.values()) {
      if (!entity.hitTest(normX, normY)) continue;

      entity.applyHit(nowMs);

      this.sparks.push(createHitSpark(normX, normY, nowMs));
      this.callbacks.onHit();
      return;
    }

    this.sparks.push(createHitSpark(normX, normY, nowMs));
  };

  private tick = (nowMs: number): void => {
    if (!this.running) return;

    const deltaMs = Math.min(48, Math.max(0, nowMs - this.lastFrameMs));
    this.lastFrameMs = nowMs;

    for (const [id, entity] of this.entities) {
      entity.update(deltaMs, nowMs);

      if (entity.state === 'escaped') {
        this.entities.delete(id);
        this.callbacks.onMiss();
        continue;
      }

      if (entity.isFinished()) {
        this.entities.delete(id);
      }
    }

    const pruned = pruneHitSparks(this.sparks, nowMs);
    this.sparks.length = 0;
    this.sparks.push(...pruned);

    this.drawFrame(nowMs);
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private drawFrame(nowMs: number): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    const bounds = { width, height };
    for (const entity of this.entities.values()) {
      entity.render({ ctx: this.ctx, bounds, nowMs });
    }

    renderHitSparks(this.ctx, this.sparks, nowMs, width, height);
  }

  private resizeCanvas(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width = Math.max(1, Math.floor(parent.clientWidth));
    const height = Math.max(1, Math.floor(parent.clientHeight));
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

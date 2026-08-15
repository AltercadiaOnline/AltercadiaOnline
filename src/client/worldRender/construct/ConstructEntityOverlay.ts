import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import { renderPlayer } from '../../renderPlayer.js';
import { drawCreatureIdleSpriteAtFeet } from '../../world/creatureWorldImageLoader.js';
import { renderCreatureOnWorldMap } from '../../world/creatureWorldRenderer.js';
import type { WorldNpcRenderSnapshot } from '../../world/worldActorsRenderSnapshot.js';
import { getResolvedNpcRegistry } from '../../../shared/world/npcRegistry.js';
import { disableCanvasImageSmoothing } from '../../layout/gamePixelScale.js';
import { snapToPixel } from '../../render/pixelSnap.js';
import { renderWorldNpcSnapshot } from '../../world/npcRenderer.js';
import { renderPetSprite } from '../../entities/pet/petRenderer.js';
import { PetSpriteLoader } from '../../entities/pet/PetSpriteLoader.js';
import { tacticalSprayService } from '../../../shared/social/tacticalSprayStore.js';
import { OFFICIAL_SPRAY_STENCILS } from '../../../shared/types/tacticalSpray.js';

const VIEWPORT_W = DESIGN_CONFIG.VIEWPORT.WIDTH;
const VIEWPORT_H = DESIGN_CONFIG.VIEWPORT.HEIGHT;

/**
 * Canvas DOM sobre o iframe Construct — desenha jogador, NPCs e criaturas
 * espelhando o snapshot autoritativo (servidor / Exploration).
 */
export class ConstructEntityOverlay {
  private canvas: HTMLCanvasElement | null = null;

  private ctx: CanvasRenderingContext2D | null = null;

  private readonly npcSpriteById = new Map(
    getResolvedNpcRegistry().map((entry) => [entry.id, entry.sprite] as const),
  );

  mount(host: HTMLElement): void {
    this.unmount();

    const canvas = document.createElement('canvas');
    canvas.id = 'construct-entity-overlay';
    canvas.width = VIEWPORT_W;
    canvas.height = VIEWPORT_H;
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: `${VIEWPORT_W}px`,
      height: `${VIEWPORT_H}px`,
      pointerEvents: 'none',
      zIndex: '2',
      imageRendering: 'pixelated',
      background: 'transparent',
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[ConstructEntityOverlay] 2D context indisponível.');
      return;
    }

    disableCanvasImageSmoothing(ctx);
    host.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = ctx;
    void PetSpriteLoader.preloadAll();
  }

  unmount(): void {
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }

  render(frame: ExplorationRenderFrame): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    ctx.save();
    // Mesmo snap da Camera — Construct e overlay devem compartilhar pan inteiro.
    ctx.translate(-snapToPixel(frame.cameraX), -snapToPixel(frame.cameraY));

    for (const actor of frame.worldActors) {
      if (actor.kind === 'npc') {
        this.renderNpc(ctx, actor, frame.timestampMs);
        continue;
      }
      this.renderCreature(ctx, actor);
    }

    // Desenhar pichações ativas sob o mapa antes de desenhar o jogador e o pet.
    try {
      const tileSize = DESIGN_CONFIG.TILE.SIZE;
      const zoneId = String(frame.mapId);
      const sprays = tacticalSprayService.getSpraysInZone(zoneId);
      const imageCache: Map<string, HTMLImageElement | 'error'> = (ConstructEntityOverlay as any)._sprayImageCache || new Map();
      (ConstructEntityOverlay as any)._sprayImageCache = imageCache;
      for (const sp of sprays) {
        const feetX = sp.posX * tileSize + tileSize / 2;
        const feetY = sp.posY * tileSize + tileSize;
        ctx.save();
        disableCanvasImageSmoothing(ctx);
        ctx.globalAlpha = 0.95;
        const stencil = OFFICIAL_SPRAY_STENCILS?.[sp.sprayAssetId];
        const nameFallback = (sp.sprayAssetId || '').replace('spray_', '');
        const assetUrl = stencil?.renderAssetUrl || `/assets/sprays/renders/${nameFallback}.png`;

        const cached = imageCache.get(assetUrl);
        if (cached instanceof HTMLImageElement && cached.complete && cached.naturalWidth > 0) {
          const img = cached;
          const drawW = img.naturalWidth;
          const drawH = img.naturalHeight;
          const dx = Math.round(feetX - drawW / 2);
          const dy = Math.round(feetY - drawH);
          ctx.drawImage(img, dx, dy, drawW, drawH);
        } else if (!cached) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            imageCache.set(assetUrl, img);
          };
          img.onerror = () => {
            imageCache.set(assetUrl, 'error');
          };
          imageCache.set(assetUrl, img);
          img.src = assetUrl;
        }
        ctx.restore();
      }
    } catch {
      // no-op: render loop must not throw
    }

    const pet = frame.pet;
    const drawPetBeforePlayer = Boolean(
      pet?.visible && pet.y <= frame.playerY,
    );
    if (drawPetBeforePlayer && pet) {
      renderPetSprite(ctx, pet, frame.timestampMs);
    }

    if (Number.isFinite(frame.playerX) && Number.isFinite(frame.playerY)) {
      renderPlayer(
        ctx,
        {
          x: frame.playerX,
          y: frame.playerY,
          facing: frame.facing,
        },
        frame.timestampMs,
      );
    }

    if (pet?.visible && !drawPetBeforePlayer) {
      renderPetSprite(ctx, pet, frame.timestampMs);
    }

    ctx.restore();
  }

  private renderNpc(
    ctx: CanvasRenderingContext2D,
    snapshot: WorldNpcRenderSnapshot,
    timestampMs: number,
  ): void {
    const spriteKey = this.npcSpriteById.get(snapshot.npcId) ?? 'elder';
    renderWorldNpcSnapshot(ctx, snapshot, spriteKey, timestampMs);
  }

  private renderCreature(
    ctx: CanvasRenderingContext2D,
    snapshot: Extract<ExplorationRenderFrame['worldActors'][number], { kind: 'creature' }>,
  ): void {
    const drewSprite = drawCreatureIdleSpriteAtFeet(
      ctx,
      snapshot.creatureId,
      snapshot.feetX,
      snapshot.feetY,
      snapshot.facing,
    );
    if (drewSprite) {
      if (snapshot.adjacent) {
        const bounce = Math.round(Math.sin(snapshot.alertPulse) * 2);
        ctx.fillStyle = '#ffea00';
        ctx.fillRect(
          Math.round(snapshot.feetX) - 1,
          Math.round(snapshot.feetY - 40 + bounce),
          2,
          7,
        );
      }
      return;
    }

    const tileSize = DESIGN_CONFIG.TILE.SIZE;
    const tileX = Math.floor(snapshot.feetX / tileSize);
    const tileY = Math.floor(snapshot.feetY / tileSize);
    renderCreatureOnWorldMap(ctx, {
      creatureId: snapshot.creatureId,
      tileX,
      tileY,
      adjacent: snapshot.adjacent,
      alertPulse: snapshot.alertPulse,
      facing: snapshot.facing,
      worldX: snapshot.feetX,
      worldY: snapshot.feetY,
    });
  }
}

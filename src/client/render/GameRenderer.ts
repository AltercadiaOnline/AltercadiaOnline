import {
  GAME_RENDER_HEIGHT,
  GAME_RENDER_WIDTH,
} from '../layout/gameLayout.js';
import { configureFixedGameCanvas, disableCanvasImageSmoothing } from '../layout/gamePixelScale.js';
import { drawDepthSortedInPlace, type WorldDepthDrawable } from '../../shared/world/worldDepthSort.js';
import type { GameRenderState } from './GameRenderState.js';
import { snapToPixel, wrapPixelSnappedContext } from './pixelSnap.js';

export { snapToPixel } from './pixelSnap.js';

/**
 * Motor de renderização unificado — exploração apenas.
 * Não conhece batalha, cassino ou minigames; desenha o que recebe em GameRenderState.
 */
export class GameRenderer {
  private readonly depthBuffer: WorldDepthDrawable[] = [];

  /**
   * Fixa resolução nativa 640×360 no backing store e no CSS do canvas.
   * Escala visual fica no container (#game-stage-scale), nunca no canvas.
   */
  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.pinNativeCanvasResolution(canvas);
    }
  }

  private pinNativeCanvasResolution(canvas: HTMLCanvasElement): void {
    configureFixedGameCanvas(canvas);
    canvas.width = GAME_RENDER_WIDTH;
    canvas.height = GAME_RENDER_HEIGHT;
    canvas.style.width = `${GAME_RENDER_WIDTH}px`;
    canvas.style.height = `${GAME_RENDER_HEIGHT}px`;
    canvas.style.transform = '';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
  }

  /**
   * Pipeline autoritativo por frame:
   * 1. Clear buffer
   * 2. Background (mapa) em espaço de mundo
   * 3. Sprites com Y-sort
   * 4. Overlays de mundo (debug, marcadores)
   * 5. UI em espaço de tela (canvas)
   * 6. DOM overlay (nametags)
   */
  render(ctx: CanvasRenderingContext2D, state: GameRenderState): void {
    const snapCtx = wrapPixelSnappedContext(ctx);

    snapCtx.save();
    disableCanvasImageSmoothing(ctx);

    this.clearBuffer(snapCtx, state);
    this.renderWorldLayers(snapCtx, state);
    // Balões de fala: ctx sem snap — texto legível; sprites continuam no snapCtx acima.
    this.renderScreenSpaceLayer(ctx, state);

    snapCtx.restore();
    state.camera.resetTransform(ctx);

    state.syncDomOverlay?.();
  }

  private clearBuffer(ctx: CanvasRenderingContext2D, state: GameRenderState): void {
    ctx.fillStyle = state.clearColor;
    ctx.fillRect(
      0,
      0,
      snapToPixel(state.viewport.width),
      snapToPixel(state.viewport.height),
    );
  }

  private renderWorldLayers(ctx: CanvasRenderingContext2D, state: GameRenderState): void {
    ctx.save();
    state.camera.applyTransform(ctx);

    state.drawBackground(ctx);

    const drawables = this.depthBuffer;
    drawables.length = 0;
    drawables.push(...state.collectDynamicDrawables(ctx));
    drawDepthSortedInPlace(drawables);

    state.drawWorldOverlays?.(ctx);

    ctx.restore();
    state.camera.resetTransform(ctx);
  }

  private renderScreenSpaceLayer(ctx: CanvasRenderingContext2D, state: GameRenderState): void {
    state.drawScreenSpace?.(ctx);
  }
}

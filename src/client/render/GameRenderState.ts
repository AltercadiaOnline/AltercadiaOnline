import type { WorldDepthDrawable } from '../../shared/world/worldDepthSort.js';

/** Contrato mínimo de câmera — GameRenderer não importa a classe Camera. */
export type GameRenderCamera = {
  applyTransform(ctx: CanvasRenderingContext2D): void;
  resetTransform(ctx: CanvasRenderingContext2D): void;
};

/**
 * Estado imutável de um frame de renderização.
 * Montado a partir do state-sync + simulação local; consumido apenas pelo GameRenderer.
 */
export type GameRenderState = {
  readonly timestampMs: number;
  readonly mapId: string;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
  };
  readonly clearColor: string;
  readonly camera: GameRenderCamera;

  /** Camada 1 — chão/tiles (espaço de mundo, com transform da câmera). */
  readonly drawBackground: (ctx: CanvasRenderingContext2D) => void;

  /** Camada 2 — entidades dinâmicas (estruturas, criaturas, NPCs, jogador). */
  readonly collectDynamicDrawables: (ctx: CanvasRenderingContext2D) => readonly WorldDepthDrawable[];

  /** Overlays em espaço de mundo após Y-sort (debug, marcadores). */
  readonly drawWorldOverlays?: (ctx: CanvasRenderingContext2D) => void;

  /** Camada 3 — HUD canvas sem câmera (balões de fala). */
  readonly drawScreenSpace?: (ctx: CanvasRenderingContext2D) => void;

  /** DOM sincronizado após o canvas (nametags, fora do transform CSS). */
  readonly syncDomOverlay?: () => void;
};

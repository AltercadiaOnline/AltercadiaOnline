import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { applyBaseViewportCssVars } from './UIConstants.js';

/** Largura fixa da sidebar direita — fora do cálculo da câmera. */
export const GAME_HUD_SIDEBAR_WIDTH_PX = 250;

export const GAME_VIEWPORT_ID = 'game-viewport';
export const GAME_STAGE_FRAME_ID = 'game-stage-frame';
/** Container lógico 640×360 — recebe `transform: scale(n)` (spec: #game-container). */
export const GAME_STAGE_SCALE_ID = 'game-stage-scale';

/** @alias GAME_STAGE_SCALE_ID — nome do contrato de layout do Core. */
export const GAME_DISPLAY_CONTAINER_ID = GAME_STAGE_SCALE_ID;
export const GAME_UI_OVERLAY_ID = 'game-ui-overlay';
export const GAME_STAGE_ID = 'game-stage';
export const GAME_CANVAS_ID = 'game-canvas';
export const NPC_NAMES_LAYER_ID = 'npc-names-layer';
export const SPEECH_BUBBLES_LAYER_ID = 'speech-bubbles-layer';

/** @deprecated Use GAME_CANVAS_ID */
export const WORLD_CANVAS_ID = GAME_CANVAS_ID;

/** Contrato visual fixo — buffer e layout lógico 640×360 (inalterável). */
export const GAME_RENDER_WIDTH = DESIGN_CONFIG.VIEWPORT.WIDTH;
export const GAME_RENDER_HEIGHT = DESIGN_CONFIG.VIEWPORT.HEIGHT;

export type ViewportSize = {
  readonly width: number;
  readonly height: number;
};

export function getGameViewportElement(): HTMLElement | null {
  return document.getElementById(GAME_VIEWPORT_ID);
}

/** Buffer de renderização fixo — independe do tamanho da janela do navegador. */
export function readGameViewportSize(_fallback?: ViewportSize): ViewportSize {
  return {
    width: GAME_RENDER_WIDTH,
    height: GAME_RENDER_HEIGHT,
  };
}

/**
 * Escala máxima mantendo aspect ratio 16:9 (contain).
 * `Math.min(largura/640, altura/360)` — barras pretas no viewport, sem crop.
 */
export function computeGameStageScale(containerWidth: number, containerHeight: number): number {
  if (containerWidth <= 0 || containerHeight <= 0) return 1;
  return Math.min(
    containerWidth / GAME_RENDER_WIDTH,
    containerHeight / GAME_RENDER_HEIGHT,
  );
}

function readLayoutViewportSize(): { readonly width: number; readonly height: number } {
  const viewport = getGameViewportElement();
  if (viewport && viewport.clientWidth > 0 && viewport.clientHeight > 0) {
    return { width: viewport.clientWidth, height: viewport.clientHeight };
  }
  if (typeof window !== 'undefined') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return { width: GAME_RENDER_WIDTH, height: GAME_RENDER_HEIGHT };
}

/**
 * Aplica `transform: scale(n)` somente no container 640×360 (#game-stage-scale).
 * Canvas permanece 640×360 nativo — nunca recebe escala CSS.
 */
export function updateScale(): number {
  const viewport = getGameViewportElement();
  const scaleHost = document.getElementById(GAME_DISPLAY_CONTAINER_ID);
  const overlay = document.getElementById(GAME_UI_OVERLAY_ID);
  const namesLayer = document.getElementById(NPC_NAMES_LAYER_ID);
  if (!scaleHost) return 1;

  enforceFixedGameStagePixels();

  const { width, height } = readLayoutViewportSize();
  const scale = computeGameStageScale(width, height);

  scaleHost.style.transform = `scale(${scale})`;
  scaleHost.style.transformOrigin = 'center center';

  for (const el of [overlay, namesLayer]) {
    if (!el) continue;
    el.style.transform = 'none';
    el.style.transformOrigin = '';
  }

  if (viewport) {
    viewport.style.setProperty('--game-display-scale', String(scale));
    applyBaseViewportCssVars(viewport);
  }
  return scale;
}

/** Camada HUD — sempre no overlay, fora do canvas escalado. */
export function resolveGameUiLayer(root: ParentNode = document): HTMLElement | null {
  const overlay = root.querySelector<HTMLElement>(`#${GAME_UI_OVERLAY_ID}`);
  if (!overlay) return null;

  let layer = overlay.querySelector<HTMLElement>('#ui-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'ui-layer';
    layer.className = 'ui-layer';
    layer.setAttribute('aria-label', 'Camada de interface');
    overlay.appendChild(layer);
  }

  root.querySelector('#game-stage #ui-layer')?.remove();
  return layer;
}

/** Garante buffer/CSS 640×360 no canvas — sem escala, % ou flex no #game-canvas. */
export function enforceFixedGameStagePixels(): void {
  const canvas = document.getElementById(GAME_CANVAS_ID);
  if (canvas instanceof HTMLCanvasElement) {
    canvas.width = GAME_RENDER_WIDTH;
    canvas.height = GAME_RENDER_HEIGHT;
    canvas.style.width = `${GAME_RENDER_WIDTH}px`;
    canvas.style.height = `${GAME_RENDER_HEIGHT}px`;
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    canvas.style.flexGrow = '';
    canvas.style.flex = '';
  }

  const stage = document.getElementById(GAME_STAGE_ID);
  if (stage) {
    stage.style.transform = '';
    stage.style.transformOrigin = '';
  }

  const scaleHost = document.getElementById(GAME_DISPLAY_CONTAINER_ID);
  if (scaleHost) {
    scaleHost.style.width = `${GAME_RENDER_WIDTH}px`;
    scaleHost.style.height = `${GAME_RENDER_HEIGHT}px`;
  }
}

/** ResizeObserver + window resize — executa updateScale ao carregar e ao redimensionar. */
export function initGameStageScale(onAfterScale?: () => void): () => void {
  const run = (): void => {
    updateScale();
    onAfterScale?.();
  };

  run();

  const disconnectViewport = observeGameViewportResize(run);
  if (typeof window === 'undefined') {
    return disconnectViewport;
  }

  window.addEventListener('resize', run);
  return () => {
    disconnectViewport();
    window.removeEventListener('resize', run);
  };
}

/** Mapeia clique (tela) → buffer 640×360. */
export function mapPointerToRenderBuffer(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: ((clientX - rect.left) / rect.width) * GAME_RENDER_WIDTH,
    y: ((clientY - rect.top) / rect.height) * GAME_RENDER_HEIGHT,
  };
}

export function observeGameViewportResize(onResize: () => void): () => void {
  const viewport = getGameViewportElement();
  if (!viewport || typeof ResizeObserver === 'undefined') {
    return () => undefined;
  }

  const observer = new ResizeObserver(() => onResize());
  observer.observe(viewport);
  return () => observer.disconnect();
}

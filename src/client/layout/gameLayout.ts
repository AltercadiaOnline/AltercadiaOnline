import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { applyBaseViewportCssVars } from './UIConstants.js';

/** Largura fixa da sidebar direita — fora do cálculo da câmera. */
export const GAME_HUD_SIDEBAR_WIDTH_PX = 250;

export const GAME_VIEWPORT_ID = 'game-viewport';
export const GAME_RENDER_COLUMN_ID = 'game-render-column';
export const GAME_STAGE_FRAME_ID = 'game-stage-frame';
/** Container lógico 640×360 — recebe `transform: scale(n)` (spec: #game-container). */
export const GAME_STAGE_SCALE_ID = 'game-stage-scale';

/** Frame letterbox da arena de batalha (coluna sem sidebar). */
export const BATTLE_STAGE_FRAME_ID = 'battle-stage-frame';
/** Host 640×360 da arena — mesma escala contain do mundo. */
export const BATTLE_STAGE_SCALE_ID = 'battle-stage-scale';
export const SCENE_COMBAT_ID = 'scene-combat';

/** @alias GAME_STAGE_SCALE_ID — nome do contrato de layout do Core. */
export const GAME_DISPLAY_CONTAINER_ID = GAME_STAGE_SCALE_ID;
export const GAME_UI_OVERLAY_ID = 'game-ui-overlay';
export const GAME_STAGE_ID = 'game-stage';
export const GAME_RENDER_HOST_ID = 'game-render-host';

/** @deprecated Canvas legado removido — input/render no host Construct. */
export const GAME_CANVAS_ID = 'world-mount-root';
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
 * Contain — 640×360 inteiro visível. Usado na arena de batalha (chrome próprio).
 * `Math.min(largura/640, altura/360)` — faixas se o frame não for 16:9.
 */
export function computeGameStageContainScale(containerWidth: number, containerHeight: number): number {
  if (containerWidth <= 0 || containerHeight <= 0) return 1;
  return Math.min(
    containerWidth / GAME_RENDER_WIDTH,
    containerHeight / GAME_RENDER_HEIGHT,
  );
}

/**
 * Cover — preenche a coluna do mundo sem faixas pretas.
 * Buffer continua 640×360; o overflow é clipado (crop mínimo). Sem stretch.
 */
export function computeGameStageCoverScale(containerWidth: number, containerHeight: number): number {
  if (containerWidth <= 0 || containerHeight <= 0) return 1;
  return Math.max(
    containerWidth / GAME_RENDER_WIDTH,
    containerHeight / GAME_RENDER_HEIGHT,
  );
}

/** @alias computeGameStageContainScale — callers de batalha / layout legado. */
export function computeGameStageScale(containerWidth: number, containerHeight: number): number {
  return computeGameStageContainScale(containerWidth, containerHeight);
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
 * Mundo usa cover (preenche a coluna, clipa o excedente). Canvas permanece 640×360 nativo.
 * Batalha usa contain no próprio frame (`updateBattleStageScale`).
 */
export function updateScale(): number {
  const viewport = getGameViewportElement();
  const scaleHost = document.getElementById(GAME_DISPLAY_CONTAINER_ID);
  const overlay = document.getElementById(GAME_UI_OVERLAY_ID);
  const namesLayer = document.getElementById(NPC_NAMES_LAYER_ID);

  enforceFixedGameStagePixels();

  const { width, height } = readLayoutViewportSize();
  const scale = computeGameStageCoverScale(width, height);

  if (scaleHost) {
    scaleHost.style.transform = `scale(${scale})`;
    scaleHost.style.transformOrigin = 'center center';
  }

  for (const el of [overlay, namesLayer]) {
    if (!el) continue;
    el.style.transform = 'none';
    el.style.transformOrigin = '';
  }

  if (viewport) {
    viewport.style.setProperty('--game-display-scale', String(scale));
    applyBaseViewportCssVars(viewport);
  }

  updateBattleStageScale();
  return scale;
}

/**
 * Lutadores/VFX permanecem em contain; o canvas de background irmão preenche o frame
 * separadamente, sem deformar personagens nem cortar o PNG.
 */
export function updateBattleStageScale(): number {
  const battleScaleHost = document.getElementById(BATTLE_STAGE_SCALE_ID);
  if (!battleScaleHost) return 1;

  battleScaleHost.style.width = `${GAME_RENDER_WIDTH}px`;
  battleScaleHost.style.height = `${GAME_RENDER_HEIGHT}px`;

  const combatScene = document.getElementById(SCENE_COMBAT_ID);
  const frame = document.getElementById(BATTLE_STAGE_FRAME_ID);
  const container = frame ?? combatScene;
  if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) {
    battleScaleHost.style.transform = 'scale(1)';
    battleScaleHost.style.transformOrigin = 'center center';
    return 1;
  }

  const battleScale = computeGameStageContainScale(container.clientWidth, container.clientHeight);
  battleScaleHost.style.transform = `scale(${battleScale})`;
  battleScaleHost.style.transformOrigin = 'center center';
  return battleScale;
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

/** Garante layout fixo 640×360 — escala só via updateScale() no container. */
export function enforceFixedGameStagePixels(): void {
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

  const battleScaleHost = document.getElementById(BATTLE_STAGE_SCALE_ID);
  if (battleScaleHost) {
    battleScaleHost.style.width = `${GAME_RENDER_WIDTH}px`;
    battleScaleHost.style.height = `${GAME_RENDER_HEIGHT}px`;
  }
}

/** ResizeObserver + window/fullscreen — escala modular (janela ou F11). */
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
  document.addEventListener('fullscreenchange', run);
  window.visualViewport?.addEventListener('resize', run);

  return () => {
    disconnectViewport();
    window.removeEventListener('resize', run);
    document.removeEventListener('fullscreenchange', run);
    window.visualViewport?.removeEventListener('resize', run);
  };
}

/** Mapeia clique (tela) → buffer 640×360. */
export function mapPointerToRenderBuffer(
  surface: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = surface.getBoundingClientRect();
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

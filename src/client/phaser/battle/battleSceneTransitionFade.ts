import { isPhaserRenderEngineActive } from '../../app/bridge/renderLayerBridge.js';

export const GAME_SCENE_FADE_OVERLAY_ID = 'game-scene-fade-overlay';

const FADE_IN_MS = 400;
const FADE_OUT_MS = 380;
const EXIT_HOLD_MS = 280;
const EXIT_REVEAL_MS = 320;

let pendingEnterReveal = false;

function resolveOverlay(): HTMLElement | null {
  return document.getElementById(GAME_SCENE_FADE_OVERLAY_ID);
}

function waitTransition(el: HTMLElement, fallbackMs: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener('transitionend', finish);
      resolve();
    };
    el.addEventListener('transitionend', finish);
    setTimeout(finish, fallbackMs);
  });
}

function showOverlay(): HTMLElement | null {
  const overlay = resolveOverlay();
  if (!overlay) return null;
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  return overlay;
}

function hideOverlay(overlay: HTMLElement): void {
  overlay.classList.add('hidden');
  overlay.classList.remove('is-fading-in', 'is-active');
  overlay.setAttribute('aria-hidden', 'true');
}

/** Ramo Phaser — fade para preto antes do commit de BATTLE. */
export async function beginBattleEnterSceneFade(): Promise<void> {
  if (!isPhaserRenderEngineActive()) return;

  const overlay = showOverlay();
  if (!overlay) return;

  overlay.classList.remove('is-active');
  overlay.classList.add('is-fading-in');
  await waitTransition(overlay, FADE_IN_MS);
  overlay.classList.remove('is-fading-in');
  overlay.classList.add('is-active');
  pendingEnterReveal = true;
}

/** Chamado após `applyGameStateToScenes(BATTLE)` — revela arena Phaser. */
export async function completeBattleEnterSceneFadeIfPending(): Promise<void> {
  if (!pendingEnterReveal || !isPhaserRenderEngineActive()) return;

  const overlay = resolveOverlay();
  pendingEnterReveal = false;
  if (!overlay) return;

  overlay.classList.remove('is-fading-in', 'is-active');
  await waitTransition(overlay, FADE_OUT_MS);
  hideOverlay(overlay);
}

export function hasPendingBattleEnterReveal(): boolean {
  return pendingEnterReveal;
}

/** Ramo Phaser — espelha `exitWithFade` com callback no pico preto. */
export async function runPhaserBattleExitFade(onMidFade?: () => void): Promise<void> {
  if (!isPhaserRenderEngineActive()) {
    onMidFade?.();
    return;
  }

  const overlay = showOverlay();
  if (!overlay) {
    onMidFade?.();
    return;
  }

  overlay.classList.remove('is-active');
  overlay.classList.add('is-fading-in');
  await waitTransition(overlay, EXIT_HOLD_MS);
  onMidFade?.();
  overlay.classList.remove('is-fading-in');
  await waitTransition(overlay, EXIT_REVEAL_MS);
  hideOverlay(overlay);
}

export function resetBattleSceneTransitionFade(): void {
  pendingEnterReveal = false;
  const overlay = resolveOverlay();
  if (!overlay) return;
  hideOverlay(overlay);
}

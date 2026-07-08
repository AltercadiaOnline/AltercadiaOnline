import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';
import { forceHideZoneTransitionOverlay } from '../world/zoneTransitionOverlay.js';
import { resetBattleSceneTransitionFade } from './battle/battleSceneTransitionFade.js';
import { GAME_RENDER_HOST_ID, PHASER_MOUNT_ROOT_ID } from './PhaserConfig.js';

/** Superfície de input do mundo (clique / WASD focus) — host Phaser. */
export function resolveGameWorldInputSurface(): HTMLElement | null {
  return document.getElementById(PHASER_MOUNT_ROOT_ID);
}

export function revealPhaserMountHost(): void {
  const phaserHost = resolveGameWorldInputSurface();
  if (phaserHost) {
    phaserHost.classList.remove('hidden');
    phaserHost.toggleAttribute('aria-hidden', false);
  }
}

function hidePhaserMountHost(): void {
  const phaserHost = resolveGameWorldInputSurface();
  if (phaserHost) {
    phaserHost.classList.add('hidden');
    phaserHost.toggleAttribute('aria-hidden', true);
  }
}

/** Pipeline Phaser — único motor de render do mundo. */
export function activatePhaserExplorationPipeline(): void {
  const renderHost = document.getElementById(GAME_RENDER_HOST_ID);
  if (renderHost) {
    renderHost.dataset.renderEngine = 'phaser';
  }

  resetBattleSceneTransitionFade();
  forceHideZoneTransitionOverlay();
  revealPhaserMountHost();
  getRenderLayerBridge().markPhaserSceneReady(true);
}

export function deactivatePhaserExplorationPipeline(): void {
  hidePhaserMountHost();
  getRenderLayerBridge().markPhaserSceneReady(false);
}

/** Bloqueia cliques no mundo (ex.: modal NPC aberta). */
export function setPhaserWorldInputBlocked(blocked: boolean): void {
  const host = resolveGameWorldInputSurface();
  if (host) {
    host.classList.toggle('phaser-mount-root--input-blocked', blocked);
  }
}

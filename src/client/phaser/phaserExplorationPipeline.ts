import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';
import { CANVAS_LEGACY_ID, GAME_RENDER_HOST_ID, PHASER_MOUNT_ROOT_ID } from './PhaserConfig.js';

const LEGACY_CANVAS_PASSIVE_CLASS = 'game-canvas--phaser-passive';

/**
 * Phaser montado — mapa e entidades no host Phaser.
 * O canvas legado permanece no DOM (Exploration ainda referencia o nó), mas não pinta nem captura input.
 */
export function revealPhaserMountHost(): void {
  const phaserHost = document.getElementById(PHASER_MOUNT_ROOT_ID);
  if (phaserHost) {
    phaserHost.classList.remove('hidden');
    phaserHost.toggleAttribute('aria-hidden', false);
  }
}

function hidePhaserMountHost(): void {
  const phaserHost = document.getElementById(PHASER_MOUNT_ROOT_ID);
  if (phaserHost) {
    phaserHost.classList.add('hidden');
    phaserHost.toggleAttribute('aria-hidden', true);
  }
}

/** Canvas legado fora do pipeline visual — evita duplicidade e tela preta por cima do Phaser. */
export function setLegacyCanvasPhaserPassive(passive: boolean): void {
  const canvas = document.getElementById(CANVAS_LEGACY_ID);
  if (canvas) {
    canvas.classList.toggle(LEGACY_CANVAS_PASSIVE_CLASS, passive);
    canvas.toggleAttribute('aria-hidden', passive);
  }
}

/** Ativa pipeline Phaser — único motor de render do mapa. */
export function activatePhaserExplorationPipeline(): void {
  const renderHost = document.getElementById(GAME_RENDER_HOST_ID);

  if (renderHost) {
    renderHost.dataset.renderEngine = 'phaser';
  }

  setLegacyCanvasPhaserPassive(true);
  revealPhaserMountHost();

  getRenderLayerBridge().markPhaserSceneReady(true);
}

/** Restaura canvas legado (somente dev / shutdown). */
export function deactivatePhaserExplorationPipeline(): void {
  const renderHost = document.getElementById(GAME_RENDER_HOST_ID);

  if (renderHost) {
    renderHost.dataset.renderEngine = 'canvas-legacy';
  }

  setLegacyCanvasPhaserPassive(false);
  hidePhaserMountHost();
  getRenderLayerBridge().markPhaserSceneReady(false);
}

import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';
import { CANVAS_LEGACY_ID, PHASER_MOUNT_ROOT_ID } from './PhaserConfig.js';

/**
 * Phaser montado mas canvas legado ainda desenha o mundo até o MapLoader confirmar tilesets.
 * Evita tela preta quando o Phaser boota antes do mapa Tiled estar pronto.
 */
export function revealPhaserMountHost(): void {
  const phaserHost = document.getElementById(PHASER_MOUNT_ROOT_ID);
  if (phaserHost) {
    phaserHost.classList.remove('hidden');
    phaserHost.toggleAttribute('aria-hidden', false);
  }
}

/** Ativa pipeline Phaser (esconde canvas legado) após mapa montado com sucesso. */
export function activatePhaserExplorationPipeline(): void {
  const canvas = document.getElementById(CANVAS_LEGACY_ID);
  const phaserHost = document.getElementById(PHASER_MOUNT_ROOT_ID);
  const renderHost = document.getElementById('game-render-host');

  if (renderHost) {
    renderHost.dataset.renderEngine = 'phaser';
  }

  if (canvas) {
    canvas.classList.add('hidden');
    canvas.setAttribute('aria-hidden', 'true');
  }

  if (phaserHost) {
    phaserHost.classList.remove('hidden');
    phaserHost.toggleAttribute('aria-hidden', false);
  }

  getRenderLayerBridge().markPhaserSceneReady(true);
}

/** Falha ao montar mapa Tiled — mantém canvas legado visível. */
export function fallbackToCanvasExplorationPipeline(): void {
  const canvas = document.getElementById(CANVAS_LEGACY_ID);
  const phaserHost = document.getElementById(PHASER_MOUNT_ROOT_ID);
  const renderHost = document.getElementById('game-render-host');

  if (renderHost) {
    renderHost.dataset.renderEngine = 'canvas-legacy';
  }

  if (canvas) {
    canvas.classList.remove('hidden');
    canvas.toggleAttribute('aria-hidden', false);
  }

  if (phaserHost) {
    phaserHost.classList.add('hidden');
    phaserHost.toggleAttribute('aria-hidden', true);
  }

  getRenderLayerBridge().markPhaserSceneReady(false);
}

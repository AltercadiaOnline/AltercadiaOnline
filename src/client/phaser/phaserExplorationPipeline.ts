import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';
import { CANVAS_LEGACY_ID, PHASER_MOUNT_ROOT_ID } from './PhaserConfig.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import {
  clearPhaserCanvasProceduralFallback,
  markPhaserCanvasProceduralFallback,
} from './phaserCanvasFallback.js';

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

/** Ativa pipeline Phaser — mapa no host Phaser; canvas legado desenha entidades por cima. */
export function activatePhaserExplorationPipeline(mapId?: MapId): void {
  if (mapId) {
    clearPhaserCanvasProceduralFallback(mapId);
  }
  const canvas = document.getElementById(CANVAS_LEGACY_ID);
  const phaserHost = document.getElementById(PHASER_MOUNT_ROOT_ID);
  const renderHost = document.getElementById('game-render-host');

  if (renderHost) {
    renderHost.dataset.renderEngine = 'phaser';
  }

  if (canvas) {
    canvas.classList.remove('hidden');
    canvas.toggleAttribute('aria-hidden', false);
  }

  if (phaserHost) {
    phaserHost.classList.remove('hidden');
    phaserHost.toggleAttribute('aria-hidden', false);
  }

  getRenderLayerBridge().markPhaserSceneReady(true);
}

/** Falha ao montar mapa Tiled — canvas procedural + Phaser oculto. */
export function fallbackToCanvasExplorationPipeline(mapId?: MapId): void {
  if (mapId) {
    markPhaserCanvasProceduralFallback(mapId);
  }
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
  getRenderLayerBridge().markPhaserEntitiesReady(false);
}

import type { LoadingSceneInitData } from '../scenes/createLoadingPhaserScene.js';
import {
  assertCriticalPreloaderTextures,
  type PreloaderCriticalTextureKey,
} from './preloaderCriticalAssets.js';

let preloaderReady = false;
let pendingMapLoading: LoadingSceneInitData | null = null;

export function isPreloaderReady(): boolean {
  return preloaderReady;
}

/**
 * Libera o gate somente após atlases críticos (Road2 + criaturas) estarem no cache.
 * Sem `textures`, assume que a validação já ocorreu na PreloaderScene.
 */
export function markPreloaderReady(textures?: { exists: (key: string) => boolean }): void {
  if (textures) {
    assertCriticalPreloaderTextures(textures);
  }
  preloaderReady = true;
}

export function resetPreloaderGate(): void {
  preloaderReady = false;
  pendingMapLoading = null;
}

export function requestMapLoadingAfterPreloader(data: LoadingSceneInitData): void {
  pendingMapLoading = data;
}

export function consumePendingMapLoading(): LoadingSceneInitData | null {
  const data = pendingMapLoading;
  pendingMapLoading = null;
  return data;
}

export type { PreloaderCriticalTextureKey };

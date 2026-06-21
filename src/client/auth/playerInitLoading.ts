import { getOverlayBridge } from '../app/bridge/overlayBridge.js';

export function showPlayerInitLoading(message = 'Carregando perfil no servidor…'): void {
  getOverlayBridge().showInitLoading(message);
}

export function updatePlayerInitLoadingMessage(message: string): void {
  getOverlayBridge().updateInitLoadingMessage(message);
}

export function hidePlayerInitLoading(): void {
  getOverlayBridge().hideInitLoading();
}

export function isPlayerInitLoadingVisible(): boolean {
  return getOverlayBridge().snapshot().initLoadingVisible;
}

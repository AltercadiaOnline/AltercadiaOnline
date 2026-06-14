import { postSystemTip } from './logService.js';

/** Publica mensagem no painel Log do Sistema (sem barra compacta no mapa). */
export function setGameLogMessage(message: string): void {
  postSystemTip(message);
}

/** Remove overlay legado no topo do canvas, se existir de sessões antigas. */
export function removeLegacyTopLogOverlay(): void {
  document.getElementById('portal-debug-box')?.remove();
}

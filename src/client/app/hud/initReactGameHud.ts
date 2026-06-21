/** Reserva flag da HUD React de exploração e ativa modo react-hybrid. */
import { getGameUiBridge } from '../bridge/gameUiBridge.js';

export function initReactGameHud(): void {
  document.body.dataset.reactGameHudUi = '1';
  getGameUiBridge().setMode('react-hybrid');
}

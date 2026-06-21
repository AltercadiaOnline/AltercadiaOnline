/** Reserva flag da HUD React de exploração e carrega chunk in-game sob demanda. */
import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import { ensureGameHudRuntime } from '../runtime/ensureGameHudRuntime.js';

export async function initReactGameHud(): Promise<void> {
  document.body.dataset.reactGameHudUi = '1';
  getGameUiBridge().setMode('react-hybrid');
  await ensureGameHudRuntime();
}

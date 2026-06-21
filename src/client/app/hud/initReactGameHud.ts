/** Reserva HUD React de exploração e carrega chunk in-game sob demanda. */
import { CLIENT_ARCHITECTURE_VERSION } from '../shell/uiLayers.js';
import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import { ensureGameHudRuntime } from '../runtime/ensureGameHudRuntime.js';

export async function initReactGameHud(): Promise<void> {
  getGameUiBridge().setMode(CLIENT_ARCHITECTURE_VERSION);
  await ensureGameHudRuntime();
}

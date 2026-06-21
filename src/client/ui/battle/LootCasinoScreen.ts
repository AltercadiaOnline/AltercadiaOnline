import { clearLootCasinoSessionHandlers } from '../../app/battle/lootCasinoSessionHandlers.js';
import { getLootCasinoHudBridge } from '../../app/bridge/lootCasinoHudBridge.js';

/** True enquanto a animação de slots bloqueia saída/fechar (HUD + cassino). */
export function isLootCasinoSpinning(): boolean {
  return getLootCasinoHudBridge().snapshot().spinning;
}

/** Libera overlay React do cassino e handlers de sessão. */
export function destroyActiveLootCasino(): void {
  getLootCasinoHudBridge().dismiss();
  clearLootCasinoSessionHandlers();
}

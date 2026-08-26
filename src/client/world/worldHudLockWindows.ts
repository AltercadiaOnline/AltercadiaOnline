import type { UiWindowId } from '../ui/uiEvents.js';

/** HUDs que travam movimento / pose do jogador enquanto abertas. */
export const WORLD_HUD_LOCK_WINDOW_IDS: readonly UiWindowId[] = [
  'dialogue',
  'vendorShop',
  'laboratoryShop',
  'petTrainerShop',
  'tournamentBet',
  // rankingMonitor: sem trava — PC da Arena abre como HUD normal (espelho do board).
  // pvpQueue: sem trava — jogador fica livre perto do púlpito (pose emparelhada depois).
  'refractionBooth',
  'market',
] as const;

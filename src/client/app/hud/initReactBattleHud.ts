import { getAppScreenBridge } from '../bridge/appScreenBridge.js';
import { getBattleHudBridge } from '../bridge/battleHudBridge.js';
import { syncReactBattleHudVisibility } from '../shell/clientArchitecture.js';

/** Marca a HUD React de combate como pronta e sincroniza visibilidade com a cena ativa. */
export function initReactBattleHud(): void {
  document.body.dataset.reactBattleHudUi = '1';
  getBattleHudBridge().markControllerReady();
  syncReactBattleHudVisibility(getAppScreenBridge().snapshot().activeScreen);
}

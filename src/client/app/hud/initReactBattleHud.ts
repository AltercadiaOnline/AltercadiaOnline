import { getAppScreenBridge } from '../bridge/appScreenBridge.js';
import { getBattleHudController } from '../battle/BattleHudController.js';
import { syncReactBattleHudVisibility } from '../shell/clientArchitecture.js';

/** Marca a HUD React de combate como pronta e sincroniza visibilidade com a cena ativa. */
export function initReactBattleHud(): void {
  getBattleHudController().markControllerReady();
  syncReactBattleHudVisibility(getAppScreenBridge().snapshot().activeScreen);
}

import { POST_BATTLE_HUB_ROOT_CLASS } from '../../../shared/types/postBattleHub.js';
import { getPostBattleHudBridge } from '../bridge/postBattleHudBridge.js';
import { clearPostBattleHubHandlers } from './postBattleHubHandlers.js';

/** Remove hub React + nós DOM legados remanescentes (substituto de `unmountPostBattleHub`). */
export function dismissPostBattleHubUi(): void {
  getPostBattleHudBridge().dismiss();
  clearPostBattleHubHandlers();
  if (typeof document === 'undefined') return;
  document.querySelectorAll(`.${POST_BATTLE_HUB_ROOT_CLASS}`).forEach((node) => node.remove());
}

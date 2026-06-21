/**
 * Compat — reexporta facade + tipos. Estado canônico em `battleHudStore`.
 */
export {
  getBattleHudBridge,
  getBattleHudController,
  isReactBattleHudEnabled,
} from '../battle/BattleHudController.js';

export type { BattleHudStore } from '../battle/battleHudStore.js';

export type {
  BattleData,
  BattleHudBridgeSnapshot,
  BattleHudChatLine,
  BattleHudFighterSnapshot,
  BattleHudLogLine,
  BattleHudPetSnapshot,
  BattleHudSession,
  BattleHudState,
  BattleHudTurnTimerSnapshot,
  battleSessionFromGameStore,
} from '../battle/battleHudTypes.js';

export {
  resetBattleHudStoreSession,
  useBattleHud,
  useBattleHudStore,
  useBattleSession,
} from '../battle/battleHudStore.js';

/** @deprecated Use `useBattleSession` */
export { useBattleSession as useBattleData } from '../battle/battleHudStore.js';

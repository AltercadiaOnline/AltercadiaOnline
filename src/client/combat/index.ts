/** API pública do cliente de combate — orquestração WS, playback e bootstrap. */
export {
  GameClient,
  GameClient as CombatClient,
  configureCombatClient,
  initBattleHud,
  getBattleScreen,
  getBattleController,
  mountBattleScreen,
  unmountBattleScreen,
  getBattleMount,
  getLastDispatch,
  getLastCombatState,
  registerActiveBattleId,
  prepareNextBattle,
  clearBattleSessionUi,
  getBattleHud,
  lockBattleHudInput,
  flushCombatSequence,
  isCombatSequenceProcessing,
  registerCombatSocketHandler,
  abortCombatFeedbackOnDisconnect,
  releaseCombatActionLock,
  releaseForfeitInFlight,
  attachCombatSocketListener,
  createCombatSocketHandler,
  gameClientCombatBridge,
  isCombatDispatchPayload,
  buildCombatUiHints,
  isBattleEndedPayload,
} from './client/index.js';

export type {
  BattleFinishedResult,
  BattleScreenMountOptions,
  CombatClientConfig,
  CombatSocket,
  CombatHudBridge,
  BattleEndedPayload,
  CombatDispatchPayload,
  CombatUiHints,
} from './client/index.js';

export { getBattleStore, initBattleStore, resetBattleStore } from './client/battleStore.js';
export type { BattleMenuMove } from './client/battleMenuMoves.js';
export type { BattleConsumableRow } from './client/battleConsumables.js';
export type { ActiveStatusChip } from './client/activeStatusAdapter.js';
export { readActiveStatusesFromCombatant } from './client/activeStatusAdapter.js';
export {
  captureBattleLootPreview,
  consumePendingBattleLoot,
  clearPendingBattleLoot,
  peekPendingBattleLoot,
} from './client/battleLootBuffer.js';
export {
  captureBattleLootPackage,
  peekBattleLootPackage,
  clearBattleLootPackages,
  BATTLE_LOOT_PACKAGE_EVENT,
} from './client/battleLootPackageBuffer.js';
export { traceBattleFinish } from './client/battleFinishProbe.js';
export {
  loadBattleLootPackageOnDemand,
  type BattleLootLoadContext,
} from './client/battleLootOnDemand.js';

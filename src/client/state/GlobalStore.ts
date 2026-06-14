/**
 * Global Store — fachada do estado reativo do cliente Altercadia.
 */
export {
  getGameStore as getGlobalStore,
  initGameStore as initGlobalStore,
  resetGameStore as resetGlobalStore,
  resetGameStoreState as resetGlobalStoreState,
  activateGameStoreAfterAuth as activateGlobalStoreAfterAuth,
  hydrateGameStoreFromDatabase,
  persistGameStoreToDatabase,
  sendGiftViaGameStore,
  subscribeGameStore as subscribeGlobalStore,
  type GameStoreState as GlobalStoreState,
  type GameStorePlayerState as GlobalPlayerState,
  type GameStoreBattleState as GlobalBattleState,
  type GameStoreGold as GlobalGoldState,
  type GameStoreSlice as GlobalStoreSlice,
  type PendingActionRecord as GlobalPendingActionRecord,
} from './GameStore.js';

export type { PendingActionKind } from '../../shared/sync/pendingActionProtocol.js';

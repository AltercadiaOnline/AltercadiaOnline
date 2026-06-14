/**
 * Camada de serviços central — única porta de entrada para UI → servidor/Supabase.
 *
 * Regras:
 * - UI importa apenas services/* e core/gameStoreSelectors
 * - GameStore é SSOT; UI subscribe via selectors ou InventoryService.subscribe*
 * - Falhas: GameTransactionCoordinator (alerta + rollback)
 */

export {
  confirmTransaction,
  rejectTransaction,
  reportTransactionFailure,
  resolveTransactionErrorMessage,
  runGameTransaction,
} from '../core/GameTransactionCoordinator.js';

export {
  isSyncPending,
  selectBalanceChangedPayload,
  selectGameState,
  selectInventorySlotTooltipLabel,
  selectInventorySyncIndicatorHtml,
  selectItemDisplayName,
  selectPlayerEquipment,
  selectPlayerGold,
  selectPlayerInventory,
} from '../core/gameStoreSelectors.js';

export * as GameAuthService from './auth/GameAuthService.js';
export * as InventoryService from './inventory/InventoryService.js';
export * as CurrencyService from './currency/CurrencyService.js';
export * as BattleService from './battle/BattleService.js';
export * as GiftService from './gift/GiftService.js';
export {
  getPlayerStatsGateway,
  initPlayerStatsGateway,
  resetPlayerStatsGateway,
  type PlayerStatsSnapshot,
  type PlayerStatsSource,
} from '../gateway/PlayerStatsGateway.js';

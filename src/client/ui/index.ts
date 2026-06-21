export { uiEvents, UIEventType, UiEventBus } from './uiEvents.js';
export type { UiEventMap, UiWindowId } from './uiEvents.js';

export type { UIComponent } from './UIComponent.js';
export { BaseUIComponent } from './UIComponent.js';

export { HubPanelController } from './components/HubPanelController.js';
export {
  getGlobalPlayerStore,
  initGlobalPlayerStore,
  resetGlobalPlayerStore,
} from './moveset/globalPlayerStore.js';
export type { GlobalPlayerSnapshot } from './moveset/globalPlayerStore.js';

export { KeyFeatureObserver } from './observers/KeyFeatureObserver.js';
export type { KeyFeatureMount } from './observers/KeyFeatureObserver.js';

export {
  setGameLogMessage,
  removeLegacyTopLogOverlay,
} from './gameLog.js';

export {
  UIManager,
  getUiManager,
  initUiLayer,
  destroyUiLayer,
} from './UIManager.js';

export {
  getActionDispatcher,
  initActionDispatcher,
  resetActionDispatcher,
} from '../ActionDispatcher.js';
export type { ClientAction, DispatchResult, ActionDispatcherMode } from '../ActionDispatcher.js';
export { getUIIntentStore, resetUIIntentStore } from './intent/uiIntentStore.js';
export { bindActionButton, createActionButton } from './components/ActionButton.js';
export type { ActionButtonHandle, ActionButtonOptions } from './components/ActionButton.js';
export {
  ActionGatewayButtonController,
  bindActionGatewayButton,
  createActionGatewayButton,
} from './components/ActionGatewayButton.js';
export type {
  ActionGatewayButtonHandle,
  ActionGatewayButtonOptions,
} from './components/ActionGatewayButton.js';
export {
  getGlobalStateSynchronizer,
  resetGlobalStateSynchronizer,
} from '../sync/GlobalStateSynchronizer.js';
export type { ApplySnapshotResult, IAuthoritativeDataStore } from '../../shared/IDataStore.js';
export {
  getDataStore,
  getEconomyService,
  getMockEconomyService,
  initEconomyLayer,
  resetEconomyLayer,
  resetGame,
} from '../economy/economyLayer.js';
export type { IDataStore } from '../../shared/IDataStore.js';
export type {
  DataStoreSlice,
  MarcosStateSnapshot,
  PlayerDataSnapshot,
  WalletSnapshot,
} from '../../shared/playerDataSnapshots.js';

export {
  WindowManager,
  getWindowManager,
  windowManager,
} from './WindowManager.js';

export {
  KeyboardManager,
  initKeyboardManager,
  destroyKeyboardManager,
} from './KeyboardManager.js';

export {
  ActionMenu,
  ActionMenuManager,
  ContextMenuService,
  createActionMenu,
  getActionMenuManager,
  getContextMenuService,
  initActionMenuSystem,
  initContextMenuService,
  teardownActionMenuSystem,
  teardownContextMenuService,
  registerDefaultActionMenuProviders,
  buildInventorySlotContextActions,
  buildEquipSlotContextActions,
} from './contextMenu/index.js';
export type {
  ActionMenuContext,
  ActionMenuItem,
  ActionMenuKindResolver,
  ContextMenuAction,
  ContextMenuContext,
  ContextMenuKindResolver,
  BattleOpponentMenuTarget,
  EquipSlotMenuTarget,
  InventorySlotMenuTarget,
  MonsterMenuTarget,
  PlayerMenuTarget,
} from './contextMenu/index.js';

export {
  HUD_KEYBOARD_SHORTCUTS,
  HUD_WINDOW_SHORTCUT_LABEL,
  resolveHudWindowFromKeyboard,
} from './keyboardShortcuts.js';

export { EquipmentSidebar, initEquipmentSidebar, getEquipmentSidebar } from './components/EquipmentSidebar.js';
export {
  SidebarMinimap,
  initSidebarMinimap,
  getSidebarMinimap,
  destroySidebarMinimap,
} from './components/SidebarMinimap.js';
export {
  SidebarWallet,
  initSidebarWallet,
  getSidebarWallet,
  destroySidebarWallet,
} from './components/SidebarWallet.js';
export {
  getPlayerEquipmentStore,
  resetPlayerEquipmentStore,
  type PlayerEquipmentSnapshot,
  type PlayerVitals,
} from './equipment/playerEquipmentStore.js';
export {
  getPlayerInventoryStore,
  resetPlayerInventoryStore,
  type InventorySnapshot,
  type InventorySlotState,
  INVENTORY_SLOT_COUNT,
} from './inventory/playerInventoryStore.js';
export {
  getCarryCapacityStore,
  initCarryCapacityStore,
  resetCarryCapacityStore,
  type CarryCapacitySnapshot,
} from './capacity/carryCapacityStore.js';
export {
  getGameStore,
  initGameStore,
  resetGameStore,
  resetGameStoreState,
  activateGameStoreAfterAuth,
  subscribeGameStore,
  SESSION_BOOTSTRAP_CORRELATION_ID,
  type GameStoreState,
  type GameStorePlayerState,
  type GameStoreBattleState,
  type GameStoreGold,
  type GameStoreSlice,
} from '../state/GameStore.js';
export {
  getPlayerWalletStore,
  initPlayerWalletStore,
  onBalanceChanged,
  resetPlayerWalletStore,
  type BalanceChangedPayload,
  type PlayerWalletSnapshot,
} from './wallet/playerWalletStore.js';
export {
  getPlayerSkinStore,
  resetPlayerSkinStore,
  type OwnedSkins,
  type PlayerSkinState,
} from './character/playerSkinStore.js';
export {
  getPlayerProfileStore,
  resetPlayerProfileStore,
} from './character/playerProfileStore.js';
export {
  postGameChatMessage,
  postSystemNotification,
  postSystemTip,
  publishLogServiceMessage,
  handleInboundLogService,
  initLogServiceUi,
} from './logService.js';
export { openDiaryPanel } from './diary/openDiaryPanel.js';

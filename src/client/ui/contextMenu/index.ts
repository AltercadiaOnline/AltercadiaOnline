export type {
  ActionMenuContext,
  ActionMenuItem,
  ActionMenuKindResolver,
} from './actionMenuTypes.js';
export { isActionMenuItemDisabled } from './actionMenuTypes.js';

export { ActionMenu, ACTION_MENU_HOST_ID, ACTION_MENU_ROOT_CLASS } from './ActionMenu.js';
export { createActionMenu } from './ActionMenu.js';

export {
  ContextMenuService,
  getContextMenuService,
  type ContextMenuAction,
  type ContextMenuContext,
  type ContextMenuKindResolver,
} from './ContextMenuService.js';

export {
  ActionMenuManager,
  getActionMenuManager,
} from './ActionMenuManager.js';

export type {
  BattleOpponentMenuTarget,
  EquipSlotMenuTarget,
  InventorySlotMenuTarget,
  MonsterMenuTarget,
  PlayerMenuTarget,
} from './actionMenuProviders.js';
export { registerDefaultActionMenuProviders } from './actionMenuProviders.js';

export {
  initContextMenuService,
  teardownContextMenuService,
  initActionMenuSystem,
  teardownActionMenuSystem,
} from './initActionMenu.js';

export {
  buildEquipSlotContextActions,
  buildInventorySlotContextActions,
} from './inventoryContextActions.js';

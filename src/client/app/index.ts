/** API pública da camada React / híbrida do cliente online. */
export { initClientApp, initClientAppGameLayer, resetClientAppSession, isClientAppInitialized, isClientAppGameLayerInitialized } from './bootstrap/initClientApp.js';
export { teardownClientApp } from './bootstrap/teardownClientApp.js';

export { mountReactUiRuntime } from './runtime/uiRuntime.js';
/** HUD in-game: `ensureGameHudRuntime` → `__ALTERCADIA_HUD_RUNTIME__` (mesmo React do ui-runtime). */
export { ensureGameHudRuntime } from './runtime/ensureGameHudRuntime.js';

export {
  ensureClientArchitectureRoots,
  syncReactScreenShellVisibility,
  syncReactHudVisibility,
  syncReactBattleHudVisibility,
  CLIENT_ARCHITECTURE_VERSION,
  CLIENT_ROOT_IDS,
  UI_LAYER_Z_INDEX,
} from './shell/clientArchitecture.js';

export {
  isReactAuthScreenEnabled,
  isReactCharSelectScreenEnabled,
  enableReactAuthScreen,
  enableReactCharSelectScreen,
} from './shell/screenSurface.js';

export { initReactHudHost } from './hud/reactHudHost.js';
export { initReactGameHud } from './hud/initReactGameHud.js';
export { initReactBattleHud } from './hud/initReactBattleHud.js';

export { getGameUiBridge } from './bridge/gameUiBridge.js';
export { getAppScreenBridge } from './bridge/appScreenBridge.js';
export { getPanelsBridge } from './bridge/panelsBridge.js';
export { getBattleHudBridge, getBattleHudController } from './bridge/battleHudBridge.js';

export {
  tryOpenReactWorldPanel,
  tryCloseReactWorldPanel,
  tryToggleReactWorldPanel,
  tryFocusReactWorldPanel,
  tryCloseTopmostReactWorldPanel,
} from './panels/initWorldPanelsBridge.js';
export {
  windowManager,
  openWorldWindow,
  closeWorldWindow,
  toggleWorldWindow,
  focusWorldWindow,
  closeTopmostWorldWindow,
} from './panels/worldWindowController.js';
export { initWorldPanelsBridge, teardownWorldPanelsBridge } from './panels/initWorldPanelsBridge.js';

export {
  bootOnlineWorldRender,
  enableWorldRenderForOnlineSession,
  WORLD_MOUNT_ROOT_ID,
} from '../worldRender/index.js';

export * from './store/index.js';

export type { UiSurface, UiRuntimeMode, RenderEngine } from './types/uiSurfaces.js';

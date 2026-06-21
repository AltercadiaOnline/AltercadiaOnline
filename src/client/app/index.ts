/** API pública da camada React / híbrida do cliente online. */
export { initClientApp, resetClientAppSession, isClientAppInitialized } from './bootstrap/initClientApp.js';
export { teardownClientApp } from './bootstrap/teardownClientApp.js';

export { mountReactUiRuntime } from './runtime/uiRuntime.js';
export { mountScreenRuntime } from './runtime/mountScreenRuntime.js';
export { mountHudRuntime } from './runtime/mountHudRuntime.js';
export { mountOverlayRuntime } from './runtime/mountOverlayRuntime.js';

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
export { getBattleHudBridge } from './bridge/battleHudBridge.js';

export {
  tryOpenReactWorldPanel,
  tryCloseReactWorldPanel,
} from './panels/initWorldPanelsBridge.js';

export {
  enablePhaserHybridMode,
  disablePhaserHybridMode,
  enablePhaserHybridForOnlineSession,
  isPhaserHybridDevRequested,
} from './phaser/initPhaserReadyLayer.js';

export { buildPhaserGameConfig, PHASER_DESIGN_VIEWPORT } from '../phaser/buildPhaserGameConfig.js';
export { PHASER_MAIN_SCENE_KEY, PHASER_RUNTIME_CONFIG } from '../phaser/PhaserConfig.js';

export * from './store/index.js';

export type { UiSurface, UiRuntimeMode, RenderEngine } from './types/uiSurfaces.js';

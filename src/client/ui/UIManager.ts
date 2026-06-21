import { resolveGameUiLayer } from '../layout/gameLayout.js';
import type { BaseUIComponent, UIComponent } from './UIComponent.js';
import { CentralHubPanel } from './components/CentralHubPanel.js';
import {
  createReactNativeWorldPanelStub,
  REACT_NATIVE_WORLD_PANEL_IDS,
} from './components/ReactPanelStub.js';
import { destroyEquipmentSidebar } from './components/EquipmentSidebar.js';
import { destroySidebarMinimap } from './components/SidebarMinimap.js';
import { destroySidebarWallet } from './components/SidebarWallet.js';
import { resetMinimapState } from '../world/minimap/minimapState.js';
import { registerMinimapNavigateHandler } from '../world/minimap/minimapNavigation.js';
import { clearMinimapTerrainCache } from '../world/minimap/buildMinimapTerrain.js';
import { initCarryCapacityStore, resetCarryCapacityStore } from './capacity/carryCapacityStore.js';
import { initPlayerStatsGateway, resetPlayerStatsGateway } from '../gateway/PlayerStatsGateway.js';
import { resetPlayerEquipmentStore } from './equipment/playerEquipmentStore.js';
import { resetPlayerInventoryStore } from './inventory/playerInventoryStore.js';
import { resetPlayerProfileStore } from './character/playerProfileStore.js';
import { resetPlayerSkinStore } from './character/playerSkinStore.js';
import { resetPlayerWalletStore } from './wallet/playerWalletStore.js';
import { destroyHudEventBridge, initHudEventBridge } from './hudEventBridge.js';
import { initDiaryEventBridge } from './diary/diaryEventBridge.js';
import { destroyTooltip, initTooltip } from './components/Tooltip.js';
import { resetGlobalPlayerStore } from './moveset/globalPlayerStore.js';
import { resetPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { resetPlayerMarcosStore } from './marcos/playerMarcosStore.js';
import { initEconomyLayer, attachOnlineEconomyLayer, resetEconomyLayer } from '../economy/economyLayer.js';
import { allowsOfflineGameplayFallback } from '../runtime/onlineFirstPolicy.js';
import { resetMarketplaceBuyOrderStore } from './market/marketplaceBuyOrderStore.js';
import { resetPlayerMarketStore } from './market/playerMarketStore.js';
import { installDevConsoleCommands } from '../dev/consoleCommands.js';
import { resetGlobalStateSynchronizer } from '../sync/GlobalStateSynchronizer.js';
import { initPortalModal, destroyPortalModal } from './components/PortalModal.js';
import { KeyFeatureObserver } from './observers/KeyFeatureObserver.js';
import { destroyKeyboardManager, initKeyboardManager } from './KeyboardManager.js';
import { initActionMenuSystem, teardownActionMenuSystem } from './contextMenu/initActionMenu.js';
import { uiEvents, UIEventType, type UiWindowId } from './uiEvents.js';
import { WindowManager } from './WindowManager.js';
import {
  ensureHubSocialCluster,
  mountWorldGameClock,
  type WorldGameClockHandle,
} from './world/WorldGameClock.js';
import { attachHubSocialLayoutSync } from './layout/hubSocialLayout.js';
import { bindReactWorldPanelLegacyBypass } from '../app/panels/reactWorldPanelLegacyBypass.js';
import { isReactGamePanelsEnabled } from '../app/bridge/panelsBridge.js';

export type UIManagerOptions = {
  readonly layer: HTMLElement;
  readonly launcher?: HTMLElement | null;
};

/**
 * Orquestra painéis HUD: monta templates, escuta uiEvents e controla visibilidade.
 */
export class UIManager {
  readonly hub: CentralHubPanel;
  readonly keyFeatureObserver: KeyFeatureObserver;

  private readonly layer: HTMLElement;
  private readonly launcher: HTMLElement | null;
  private readonly panels: Map<UiWindowId, UIComponent>;
  private readonly windows: WindowManager;
  private readonly unsubscribers: Array<() => void> = [];
  private worldGameClock: WorldGameClockHandle | null = null;
  private hubLayoutDisposer: (() => void) | null = null;
  private mounted = false;

  constructor(options: UIManagerOptions) {
    this.layer = options.layer;
    this.launcher = options.launcher ?? null;

    this.hub = new CentralHubPanel();
    this.keyFeatureObserver = new KeyFeatureObserver();

    this.panels = new Map<UiWindowId, UIComponent>([
      ['hub', this.hub],
      ...REACT_NATIVE_WORLD_PANEL_IDS.map(
        (windowId) => [windowId, createReactNativeWorldPanelStub(windowId)] as const,
      ),
    ]);

    for (const [windowId, panel] of this.panels) {
      if (windowId === 'hub') continue;
      bindReactWorldPanelLegacyBypass(panel as BaseUIComponent, windowId);
    }

    this.windows = new WindowManager({
      panels: this.panels,
      hub: this.hub,
    });
  }

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;

    initCarryCapacityStore();
    initPlayerStatsGateway();
    if (allowsOfflineGameplayFallback()) {
      initEconomyLayer('mock');
    } else {
      attachOnlineEconomyLayer();
    }

    if (!isReactGamePanelsEnabled()) {
      for (const panel of this.panels.values()) {
        panel.mount(this.layer);
      }
    }

    this.keyFeatureObserver.attachHub(this.hub);
    installDevConsoleCommands();
    initHudEventBridge();
    this.unsubscribers.push(initDiaryEventBridge());
    initTooltip(document.body);
    const portalParent = isReactGamePanelsEnabled()
      ? (this.layer.parentElement ?? this.layer)
      : this.layer;
    initPortalModal(portalParent);
    WindowManager.register(this.windows);
    initKeyboardManager();
    if (!isReactGamePanelsEnabled()) {
      this.worldGameClock = mountWorldGameClock(this.layer);
      this.hubLayoutDisposer = attachHubSocialLayoutSync(this.layer);
    }

    this.unsubscribers.push(
      uiEvents.on(UIEventType.OPEN_WINDOW, ({ windowId }) => {
        this.openWindow(windowId);
      }),
      uiEvents.on(UIEventType.CLOSE_WINDOW, ({ windowId }) => {
        this.closeWindow(windowId);
      }),
      uiEvents.on(UIEventType.TOGGLE_WINDOW, ({ windowId }) => {
        this.toggleWindow(windowId);
      }),
    );

    if (!isReactGamePanelsEnabled()) {
      this.launcher?.addEventListener('click', () => {
        this.windows.toggleWindow('hub');
      });
    }
  }

  openWindow(windowId: UiWindowId): void {
    this.windows.openWindow(windowId);
  }

  closeWindow(windowId: UiWindowId): void {
    this.windows.closeWindow(windowId);
  }

  toggleWindow(windowId: UiWindowId): void {
    this.windows.toggleWindow(windowId);
  }

  destroy(): void {
    this.hubLayoutDisposer?.();
    this.hubLayoutDisposer = null;
    this.worldGameClock?.destroy();
    this.worldGameClock = null;
    destroyKeyboardManager();
    WindowManager.unregister(this.windows);
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.keyFeatureObserver.detach();
    for (const panel of this.panels.values()) {
      panel.destroy();
    }
    this.mounted = false;
  }
}

let activeManager: UIManager | null = null;

export function getUiManager(): UIManager | null {
  return activeManager;
}

export function initUiLayer(root: ParentNode = document): UIManager {
  if (activeManager) return activeManager;

  const layer = resolveGameUiLayer(root);
  if (!layer) {
    throw new Error('[UI] #game-ui-overlay não encontrado — monte a cena de exploração primeiro.');
  }

  const cluster = ensureHubSocialCluster(layer);

  let launcher = cluster.querySelector<HTMLButtonElement>('#ui-hub-launcher');
  if (!launcher) {
    launcher = document.createElement('button');
    launcher.id = 'ui-hub-launcher';
    launcher.type = 'button';
    launcher.className = 'ui-hub-launcher ui-interactive';
    launcher.textContent = 'HUB';
    launcher.setAttribute('aria-label', 'Abrir Hub Social');
    cluster.appendChild(launcher);
  }

  const legacyQuickBar = layer.querySelector('#ui-quick-actions');
  legacyQuickBar?.remove();

  activeManager = new UIManager({ layer, launcher });
  activeManager.mount();
  initActionMenuSystem(document);
  return activeManager;
}

export function destroyUiLayer(): void {
  teardownActionMenuSystem();
  activeManager?.destroy();
  activeManager = null;
  destroyHudEventBridge();
  destroyTooltip();
  destroyPortalModal();
  destroyEquipmentSidebar();
  destroySidebarMinimap();
  destroySidebarWallet();
  registerMinimapNavigateHandler(null);
  resetMinimapState();
  clearMinimapTerrainCache();
  resetPlayerEquipmentStore();
  resetPlayerInventoryStore();
  resetPlayerWalletStore();
  resetPlayerSkinStore();
  resetPlayerProfileStore();
  resetCarryCapacityStore();
  resetPlayerStatsGateway();
  resetGlobalPlayerStore();
  resetPlayerProgressionStore();
  resetPlayerMarcosStore();
  resetPlayerMarketStore();
  resetMarketplaceBuyOrderStore();
  resetEconomyLayer();
  resetGlobalStateSynchronizer();
}

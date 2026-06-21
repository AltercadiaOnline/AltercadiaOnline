import { resolveGameUiLayer } from '../layout/gameLayout.js';
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
import type { UiWindowId } from './uiEvents.js';
import {
  closeWorldWindow,
  openWorldWindow,
  toggleWorldWindow,
} from '../app/panels/worldWindowController.js';

export type UIManagerOptions = {
  readonly layer: HTMLElement;
};

/**
 * Orquestra stores HUD, atalhos e serviços auxiliares da exploração.
 * Painéis móveis são renderizados exclusivamente via WorldPanelsLayer (React).
 */
export class UIManager {
  readonly keyFeatureObserver: KeyFeatureObserver;

  private readonly layer: HTMLElement;
  private mounted = false;

  constructor(options: UIManagerOptions) {
    this.layer = options.layer;
    this.keyFeatureObserver = new KeyFeatureObserver();
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

    this.keyFeatureObserver.attachHub();
    installDevConsoleCommands();
    initHudEventBridge();
    initDiaryEventBridge();
    initTooltip(document.body);
    initPortalModal(this.layer.parentElement ?? this.layer);
    initKeyboardManager();
  }

  openWindow(windowId: UiWindowId): void {
    openWorldWindow(windowId);
  }

  closeWindow(windowId: UiWindowId): void {
    closeWorldWindow(windowId);
  }

  toggleWindow(windowId: UiWindowId): void {
    toggleWorldWindow(windowId);
  }

  destroy(): void {
    destroyKeyboardManager();
    this.keyFeatureObserver.detach();
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

  layer.querySelector('#ui-quick-actions')?.remove();

  activeManager = new UIManager({ layer });
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

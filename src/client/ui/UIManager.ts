import { resolveGameUiLayer } from '../layout/gameLayout.js';
import type { UIComponent } from './UIComponent.js';
import { BankPanel } from './components/BankPanel.js';
import { CentralHubPanel } from './components/CentralHubPanel.js';
import { CharactersPanel } from './components/CharactersPanel.js';
import { ShopHudPanel } from './components/ShopHudPanel.js';
import { CraftPanel } from './components/CraftPanel.js';
import { DialoguePanel } from './components/DialoguePanel.js';
import { InventoryPanel } from './components/InventoryPanel.js';
import { MarketPanel } from './components/MarketPanel.js';
import { MarketHubPanel } from './components/MarketHubPanel.js';
import { VendorShopPanel } from './components/VendorShopPanel.js';
import { LaboratoryShopPanel } from './components/LaboratoryShopPanel.js';
import { PetTrainerShopPanel } from './components/PetTrainerShopPanel.js';
import { TournamentBetPanel } from './components/TournamentBetPanel.js';
import { RankingMonitorPanel } from './components/RankingMonitorPanel.js';
import { RefractionBoothPanel } from './components/RefractionBoothPanel.js';
import { MilestoneSkillsPanel } from './components/MilestoneSkillsPanel.js';
import { MovesetPanel } from './components/MovesetPanel.js';
import { QuestPanel } from './components/QuestPanel.js';
import { SocialPanel } from './components/SocialPanel.js';
import { PetLovePanel } from './components/PetLovePanel.js';
import { PetMemorialPanel } from './components/PetMemorialPanel.js';
import { DiaryPanel } from './components/DiaryPanel.js';
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
import { initEconomyLayer, resetEconomyLayer } from '../economy/economyLayer.js';
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

export type UIManagerOptions = {
  readonly layer: HTMLElement;
  readonly launcher?: HTMLElement | null;
};

/**
 * Orquestra painéis HUD: monta templates, escuta uiEvents e controla visibilidade.
 */
export class UIManager {
  readonly hub: CentralHubPanel;
  readonly inventory: InventoryPanel;
  readonly market: MarketPanel;
  readonly marketHub: MarketHubPanel;
  readonly vendorShop: VendorShopPanel;
  readonly laboratoryShop: LaboratoryShopPanel;
  readonly petTrainerShop: PetTrainerShopPanel;
  readonly tournamentBet: TournamentBetPanel;
  readonly rankingMonitor: RankingMonitorPanel;
  readonly refractionBooth: RefractionBoothPanel;
  readonly characters: CharactersPanel;
  readonly shop: ShopHudPanel;
  readonly moveset: MovesetPanel;
  readonly marcos: MilestoneSkillsPanel;
  readonly quest: QuestPanel;
  readonly craft: CraftPanel;
  readonly bank: BankPanel;
  readonly dialogue: DialoguePanel;
  readonly social: SocialPanel;
  readonly petLove: PetLovePanel;
  readonly petMemorial: PetMemorialPanel;
  readonly diary: DiaryPanel;
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
    this.inventory = new InventoryPanel();
    this.market = new MarketPanel();
    this.marketHub = new MarketHubPanel();
    this.vendorShop = new VendorShopPanel();
    this.laboratoryShop = new LaboratoryShopPanel();
    this.petTrainerShop = new PetTrainerShopPanel();
    this.tournamentBet = new TournamentBetPanel();
    this.rankingMonitor = new RankingMonitorPanel();
    this.refractionBooth = new RefractionBoothPanel();
    this.characters = new CharactersPanel();
    this.shop = new ShopHudPanel();
    this.moveset = new MovesetPanel();
    this.marcos = new MilestoneSkillsPanel();
    this.quest = new QuestPanel();
    this.craft = new CraftPanel();
    this.bank = new BankPanel();
    this.dialogue = new DialoguePanel();
    this.social = new SocialPanel();
    this.petLove = new PetLovePanel();
    this.petMemorial = new PetMemorialPanel();
    this.diary = new DiaryPanel();
    this.keyFeatureObserver = new KeyFeatureObserver();

    this.panels = new Map<UiWindowId, UIComponent>([
      ['hub', this.hub],
      ['inventory', this.inventory],
      ['market', this.market],
      ['marketHub', this.marketHub],
      ['vendorShop', this.vendorShop],
      ['laboratoryShop', this.laboratoryShop],
      ['petTrainerShop', this.petTrainerShop],
      ['tournamentBet', this.tournamentBet],
      ['rankingMonitor', this.rankingMonitor],
      ['refractionBooth', this.refractionBooth],
      ['characters', this.characters],
      ['shop', this.shop],
      ['moveset', this.moveset],
      ['marcos', this.marcos],
      ['quest', this.quest],
      ['craft', this.craft],
      ['bank', this.bank],
      ['dialogue', this.dialogue],
      ['social', this.social],
      ['petLove', this.petLove],
      ['petMemorial', this.petMemorial],
      ['diary', this.diary],
    ]);

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
    initEconomyLayer('mock');

    for (const panel of this.panels.values()) {
      panel.mount(this.layer);
    }

    this.keyFeatureObserver.attachHub(this.hub);
    installDevConsoleCommands();
    initHudEventBridge();
    this.unsubscribers.push(initDiaryEventBridge());
    initTooltip(document.body);
    initPortalModal(this.layer);
    WindowManager.register(this.windows);
    initKeyboardManager();
    this.worldGameClock = mountWorldGameClock(this.layer);
    this.hubLayoutDisposer = attachHubSocialLayoutSync(this.layer);

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
      uiEvents.on(UIEventType.SHOW_DIALOGUE, (payload) => {
        this.dialogue.showDialogue(payload);
      }),
      uiEvents.on(UIEventType.SHOW_VENDOR_SHOP, (payload) => {
        this.vendorShop.openForVendor(payload);
      }),
      uiEvents.on(UIEventType.SHOW_LAB_SHOP, (payload) => {
        this.laboratoryShop.openForVendor(payload);
      }),
      uiEvents.on(UIEventType.SHOW_PET_SHOP, (payload) => {
        this.petTrainerShop.openForVendor(payload);
      }),
      uiEvents.on(UIEventType.SHOW_CRAFT_STATION, (payload) => {
        this.craft.openForStation(payload);
      }),
      uiEvents.on(UIEventType.SHOW_TOURNAMENT_BET, (payload) => {
        this.tournamentBet.openForPulpit(payload);
      }),
      uiEvents.on(UIEventType.SHOW_RANKING_MONITOR, (payload) => {
        this.rankingMonitor.openForMonitor(payload);
      }),
      uiEvents.on(UIEventType.SHOW_REFRACTION_BOOTH, (payload) => {
        this.refractionBooth.openForBooth(payload);
      }),
      uiEvents.on(UIEventType.REFRACTION_CHALLENGE_ACCEPT, () => {
        this.refractionBooth.startChallengeFromNpc();
      }),
    );

    this.launcher?.addEventListener('click', () => {
      this.windows.toggleWindow('hub');
    });
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

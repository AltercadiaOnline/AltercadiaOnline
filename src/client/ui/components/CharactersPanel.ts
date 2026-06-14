import { paintCharacterPanelPreview } from '../character/characterPanelPreview.js';
import { getPlayerProfileStore } from '../character/playerProfileStore.js';
import { getPlayerSkinStore, type PlayerSkinState } from '../character/playerSkinStore.js';
import {
  EQUIPMENT_UI_SLOT_ORDER,
  EQUIPMENT_UI_SLOT_LABELS,
} from '../../../shared/character/equipmentUiSlots.js';
import type { PlayerProfileSnapshot } from '../../../shared/character/playerProfile.js';
import {
  calculateStatsBonusFromEquipment,
  type PlayerStatsBonus,
} from '../../../shared/character/playerStatsBonus.js';
import { getCarryCapacityStore } from '../capacity/carryCapacityStore.js';
import {
  SKIN_SLOT_LABELS,
  SKIN_SLOT_ORDER,
  getSkinOptionLabel,
  type PlayerSkin,
  type SkinSlotId,
} from '../../../shared/character/playerSkin.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import {
  getPlayerEquipmentStore,
  type PlayerEquipmentSnapshot,
} from '../equipment/playerEquipmentStore.js';
import type { EquipmentUiGridState } from '../../../shared/character/equipmentUiSlots.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { BaseUIComponent } from '../UIComponent.js';
import { windowManager } from '../WindowManager.js';
import { formatSpriteMetaLine } from '../../../shared/character/combatClassDisplay.js';
import {
  patchLevelProgressionSection,
  renderLevelProgressionSection,
  resolveExplorationSpeedBonusFromAgility,
} from '../character/levelProgressionSection.js';
import {
  buildOperativeEventLogLines,
  renderOperativeEventLog,
  type OperativeEventLogLine,
} from '../character/characterPanelAchievementLog.js';
import {
  patchEstiloLine,
  renderEstiloLine,
  resolveEstiloName,
} from '../character/characterPanelEstilo.js';
import { getGlobalPlayerStore } from '../moveset/globalPlayerStore.js';
import {
  renderSyncSignalBars,
  resolveMapSyncStatus,
  type MapSyncStatus,
} from '../character/characterPanelSyncStatus.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import {
  fetchWorldChronicles,
  resolveWorldLoreEntriesForClient,
} from '../../services/worldLoreClient.js';
import {
  getMinimapSnapshot,
  subscribeMinimapSnapshot,
} from '../../world/minimap/minimapState.js';
import { getPlayerPetStore } from '../pet/playerPetStore.js';
import { getPetDefinition } from '../../../shared/pet/petCatalog.js';
import { getPetColorPalette } from '../../../shared/pet/petColorPalette.js';
import { isPetDefeated } from '../../../shared/pet/petModel.js';
import type { PetSnapshot } from '../../../shared/pet/petModel.js';

type PanelState = {
  skinState: PlayerSkinState;
  equipmentMeta: PlayerEquipmentSnapshot;
  equipmentGrid: EquipmentUiGridState;
  profile: PlayerProfileSnapshot;
  statsBonus: PlayerStatsBonus;
  speedBonusTotal: number;
  isEncumbered: boolean;
  openSkinMenu: SkinSlotId | null;
};

const EMPTY_STATS: PlayerStatsBonus = {
  defesa: 0,
  esquiva: 0,
  vida: 0,
  agilidade: 0,
  critico: 0,
  forca: 0,
};

/**
 * Ficha do Personagem — 3 colunas: preview/skin | stats/PvP | equipamentos.
 * Skin é puramente visual; equipment alimenta stats de batalha.
 */
export class CharactersPanel extends BaseUIComponent {
  private state: PanelState = {
    skinState: getPlayerSkinStore().getState(),
    equipmentMeta: getPlayerEquipmentStore().getSnapshot(),
    equipmentGrid: getPlayerItemStore().toEquipmentGrid(),
    profile: getPlayerProfileStore().getSnapshot(),
    statsBonus: EMPTY_STATS,
    speedBonusTotal: 0,
    isEncumbered: getCarryCapacityStore().isEncumbered(),
    openSkinMenu: null,
  };

  private unsubSkin: (() => void) | null = null;
  private unsubEquipment: (() => void) | null = null;
  private unsubPlayerItems: (() => void) | null = null;
  private unsubProfile: (() => void) | null = null;
  private unsubStats: (() => void) | null = null;
  private unsubCapacity: (() => void) | null = null;
  private unsubWallet: (() => void) | null = null;
  private unsubMinimap: (() => void) | null = null;
  private unsubPet: (() => void) | null = null;
  private unsubLoadout: (() => void) | null = null;

  private petSnapshot: PetSnapshot | null = null;

  private syncStatus: MapSyncStatus = resolveMapSyncStatus(null);
  private eventLogLines: readonly OperativeEventLogLine[] = [];
  private resolvedEstiloName: string | null = null;

  constructor() {
    super({
      id: 'characters',
      rootClassName: 'ui-panel ui-panel--characters ui-panel--movable',
    });
  }

  protected override onOpen(): void {
    const equipment = getPlayerEquipmentStore().getSnapshot();
    getPlayerProfileStore().setLevel(equipment.level);

    this.unsubSkin = getPlayerSkinStore().subscribe((skinState) => {
      this.state = { ...this.state, skinState };
      this.refreshPreview();
      this.refreshSkinSlots();
      this.refreshSkinMenu();
    });

    this.unsubEquipment = getPlayerEquipmentStore().subscribe((snapshot) => {
      this.state = { ...this.state, equipmentMeta: snapshot };
      getPlayerProfileStore().setLevel(snapshot.level);
      this.refreshEquipmentGrid();
      this.refreshProfileBlock();
    });

    this.unsubPlayerItems = getPlayerItemStore().subscribe(() => {
      this.state = {
        ...this.state,
        equipmentGrid: getPlayerItemStore().toEquipmentGrid(),
      };
      this.refreshEquipmentGrid();
      this.syncExplorationSpeedFromEquipment();
      this.refreshProfileBlock();
    });

    this.unsubProfile = getPlayerProfileStore().subscribe((profile) => {
      this.state = { ...this.state, profile };
      this.refreshProfileBlock();
    });

    this.unsubStats = uiEvents.on(UIEventType.PLAYER_STATS_UPDATED, ({ statsBonus, speedBonusTotal }) => {
      this.state = { ...this.state, statsBonus, speedBonusTotal };
      this.refreshProfileBlock();
    });

    this.unsubCapacity = uiEvents.on(UIEventType.CAPACITY_UPDATED, (capacity) => {
      this.state = { ...this.state, isEncumbered: capacity.isEncumbered };
      this.refreshProfileBlock();
    });

    const dataStore = getDataStore();

    this.unsubWallet = dataStore.subscribe('wallet', () => {
      this.refreshWalletBlock();
    });

    this.unsubMinimap = subscribeMinimapSnapshot((snapshot) => {
      this.syncStatus = resolveMapSyncStatus(snapshot.mapId);
      this.refreshSyncIndicator();
    });

    this.unsubLoadout = getGlobalPlayerStore().subscribe(() => {
      if (this.isOpen()) this.refreshProfileBlock();
    });

    this.petSnapshot = getPlayerPetStore().getSnapshot();
    this.unsubPet = getPlayerPetStore().subscribeRoster(() => {
      const nextPet = getPlayerPetStore().getSnapshot();
      const shouldRefresh = this.shouldRefreshPetBlock(this.petSnapshot, nextPet);
      this.petSnapshot = nextPet;
      if (this.isOpen() && shouldRefresh) this.refreshPetBlock();
    });

    this.syncStatus = resolveMapSyncStatus(getMinimapSnapshot()?.mapId ?? null);
    this.resolveEstiloOnOpen();
    void this.loadEventLog();

    this.syncExplorationSpeedFromEquipment();

    this.refreshPreview();
    this.refreshProfileBlock();
    this.refreshWalletBlock();
    this.refreshSyncIndicator();
    this.refreshPetBlock();
  }

  protected override onClose(): void {
    this.unsubSkin?.();
    this.unsubSkin = null;
    this.unsubEquipment?.();
    this.unsubEquipment = null;
    this.unsubPlayerItems?.();
    this.unsubPlayerItems = null;
    this.unsubProfile?.();
    this.unsubProfile = null;
    this.unsubStats?.();
    this.unsubStats = null;
    this.unsubCapacity?.();
    this.unsubCapacity = null;
    this.unsubWallet?.();
    this.unsubWallet = null;
    this.unsubMinimap?.();
    this.unsubMinimap = null;
    this.unsubPet?.();
    this.unsubPet = null;
    this.unsubLoadout?.();
    this.unsubLoadout = null;
    this.petSnapshot = null;
    this.eventLogLines = [];
    this.resolvedEstiloName = null;
    this.state = { ...this.state, openSkinMenu: null };
  }

  createTemplate(): string {
    const { equipmentMeta, profile } = this.state;
    const wallet = getDataStore().getWallet();
    const dataStore = getDataStore();

    const sync = this.syncStatus;

    return `
      <header class="ui-panel__header character-panel__header" data-panel-drag-handle>
        <div class="character-panel__header-main">
          <div class="character-panel__header-row">
            <span class="character-panel__tag">TERMINAL // OPERATIVO</span>
            <div
              class="character-sync${sync.stable ? '' : ' character-sync--unstable'}"
              data-sync-indicator
              aria-label="Sincronia: ${sync.label} — ${sync.mapLabel}"
            >
              <span class="character-sync__label">SINCRONIA</span>
              <span class="character-sync__status" data-sync-status>${sync.label}</span>
              <span class="character-sync__bars" data-sync-bars aria-hidden="true">
                ${renderSyncSignalBars(sync.signalBars)}
              </span>
            </div>
          </div>
          <h2 class="ui-panel__title">Ficha do Personagem</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar ficha do personagem">×</button>
      </header>
      <div class="ui-panel__body character-sheet-layout">
      <div class="character-sheet character-sheet--triple">
        <div class="character-sheet__col character-sheet__col--preview">
          <div class="character-sheet__sprite-frame" aria-label="Preview do operativo">
            <canvas class="character-sheet__canvas" data-char-preview width="144" height="176"></canvas>
            <p class="character-sheet__sprite-meta">
              ${formatSpriteMetaLine(equipmentMeta.displayName, equipmentMeta.level, equipmentMeta.classId)}
            </p>
          </div>
          <section class="character-wardrobe" aria-label="Seletor de skins">
            <header class="character-wardrobe__header">
              <span class="character-wardrobe__tag">SKIN</span>
              <h3 class="character-wardrobe__title">Aparência</h3>
              <p class="character-wardrobe__hint">Cosmético — sem bônus de stats.</p>
            </header>
            <div class="character-wardrobe__slots">
              ${this.renderSkinSlots()}
            </div>
            ${this.renderSkinDropdown()}
          </section>
        </div>

        <div class="character-sheet__col character-sheet__col--stats">
          ${renderLevelProgressionSection(this.buildLevelProgressionModel())}

          <section class="character-terminal-block character-wallet-block" aria-label="Carteira" data-wallet-block>
            <header class="character-terminal-block__header">
              <span class="character-terminal-block__tag">WALLET</span>
              <h3 class="character-terminal-block__title">Recursos</h3>
            </header>
            <ul class="character-wallet-list">
              <li class="character-wallet-row">
                <span class="character-wallet-row__code">[VLT]</span>
                <strong class="character-wallet-row__value" data-wallet-vlt>${wallet.voltsFormatted}</strong>
              </li>
              <li class="character-wallet-row">
                <span class="character-wallet-row__code">[ALT]</span>
                <strong class="character-wallet-row__value" data-wallet-alt>${wallet.alterFormatted}</strong>
              </li>
            </ul>
          </section>

          <section class="character-stats-block" aria-label="PvP">
            <header class="character-stats-block__header">
              <h3 class="character-stats-block__title">Painel PvP</h3>
            </header>
            <ul class="character-pvp-grid" data-pvp-grid>
              ${this.renderPvp(profile)}
            </ul>
          </section>

          ${renderEstiloLine(this.resolvedEstiloName ?? '—')}

          ${this.renderPetsSection()}

        </div>

        <div class="character-sheet__col character-sheet__col--equipment">
          <section class="character-equip-set" aria-label="Equipamentos">
            <header class="character-equip-set__header">
              <h3 class="character-equip-set__title">SET Equipado</h3>
              <p class="character-equip-set__hint">10 slots — stats de batalha.</p>
            </header>
            <ul class="character-equip-set__grid" data-equip-grid>
              ${this.renderEquipmentGrid(this.state.equipmentGrid)}
            </ul>
          </section>
        </div>
      </div>
      <footer class="character-event-log" aria-label="Log de eventos do operativo" data-event-log>
        <header class="character-event-log__header">
          <span class="character-event-log__tag">LOG // EVENTOS</span>
          <h3 class="character-event-log__title">Marcos do Operativo</h3>
        </header>
        <ul class="character-event-log__list" data-event-log-list>
          ${renderOperativeEventLog(this.eventLogLines)}
        </ul>
      </footer>
      </div>
    `;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        windowManager.close('characters');
        return;
      }


      const skinSlot = target.closest<HTMLElement>('[data-skin-slot]');
      if (skinSlot?.dataset.skinSlot) {
        this.toggleSkinMenu(skinSlot.dataset.skinSlot as SkinSlotId);
        return;
      }

      const skinOption = target.closest<HTMLElement>('[data-skin-option]');
      if (skinOption?.dataset.skinOption && skinOption.dataset.skinSlot) {
        const slot = skinOption.dataset.skinSlot as SkinSlotId;
        const optionId = skinOption.dataset.skinOption;
        getPlayerSkinStore().setSkinSlot(slot, optionId);
        this.state = { ...this.state, openSkinMenu: null };
        this.refreshSkinMenu();
        return;
      }

      if (!target.closest('.character-wardrobe__menu') && this.state.openSkinMenu) {
        this.state = { ...this.state, openSkinMenu: null };
        this.refreshSkinMenu();
      }
    });
  }

  private renderPetsSection(): string {
    const pet = this.petSnapshot;
    const roster = getPlayerPetStore().getRoster();
    const hasAnyPet = roster.pets.length > 0;

    if (!hasAnyPet) {
      return `
        <section class="character-pets-block" aria-label="Companheiros" data-pet-section>
          <header class="character-terminal-block__header">
            <span class="character-terminal-block__tag">PETS</span>
            <h3 class="character-terminal-block__title">Companheiro ativo</h3>
          </header>
          <p class="character-pets-empty">Nenhum pet adotado. Visite o Treinador Zeno na cidade.</p>
        </section>
      `;
    }

    if (!pet) {
      return `
        <section class="character-pets-block" aria-label="Companheiros" data-pet-section>
          <header class="character-terminal-block__header">
            <span class="character-terminal-block__tag">PETS</span>
            <h3 class="character-terminal-block__title">Companheiro ativo</h3>
          </header>
          <p class="character-pets-empty">Nenhum companheiro convocado.</p>
          <p class="character-pets-hint">Abra <strong>Pet Love</strong> no Hub para escolher qual pet ativar (até 3 salvos).</p>
        </section>
      `;
    }

    const def = getPetDefinition(pet.kindId);
    const palette = getPetColorPalette(pet.colorId);
    const defeated = isPetDefeated(pet);
    const statusLabel = defeated ? 'Inativo (ferido)' : 'Convocado';
    const statusClass = defeated ? 'character-pets-status--down' : 'character-pets-status--on';

    return `
      <section class="character-pets-block" aria-label="Companheiros" data-pet-section>
        <header class="character-terminal-block__header">
          <span class="character-terminal-block__tag">PETS</span>
          <h3 class="character-terminal-block__title">Companheiro ativo</h3>
        </header>
        <div class="character-pets-card">
          <canvas class="character-pets-card__icon" data-pet-icon width="64" height="64" aria-hidden="true"></canvas>
          <div class="character-pets-card__meta">
            <p class="character-pets-card__name">${pet.name}</p>
            <p class="character-pets-card__species">${def.shopTitle}</p>
            <p class="character-pets-card__hp">HP ${pet.hpCurrent} / ${pet.hpMax}</p>
            <p class="character-pets-card__palette" style="--pet-accent:${palette.tag}">${palette.label}</p>
            <span class="character-pets-status ${statusClass}">${statusLabel}</span>
          </div>
        </div>
        <p class="character-pets-hint">Espelho do companheiro ativo — troque em Pet Love.</p>
        ${defeated ? '<p class="character-pets-hint">Visite o Ancião Cael para reviver seu companheiro.</p>' : ''}
      </section>
    `;
  }

  private shouldRefreshPetBlock(before: PetSnapshot | null, after: PetSnapshot | null): boolean {
    if (before === after) return false;
    if (!before || !after) return before !== after;
    return before.instanceId !== after.instanceId
      || before.hpCurrent !== after.hpCurrent
      || before.status !== after.status
      || before.affinityXp !== after.affinityXp;
  }

  private refreshPetBlock(): void {
    const section = this.query<HTMLElement>('[data-pet-section]');
    if (!section) return;
    section.outerHTML = this.renderPetsSection();
    this.paintPetIcon();
  }

  private paintPetIcon(): void {
    const pet = this.petSnapshot;
    const canvas = this.query<HTMLCanvasElement>('[data-pet-icon]');
    if (!pet || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    import('../../entities/pet/petRenderer.js').then(({ renderPetPortrait }) => {
      renderPetPortrait(ctx, pet.kindId, pet.colorId, canvas.width, 0, pet.gender);
    });
  }

  protected override afterRender(): void {
    this.paintPetIcon();
  }

  private renderSkinSlots(): string {
    const { skin, ownedSkins } = this.state.skinState;
    return SKIN_SLOT_ORDER.map((slot) => {
      const optionId = skin[slot];
      const label = SKIN_SLOT_LABELS[slot];
      const value = getSkinOptionLabel(slot, optionId);
      const ownedCount = ownedSkins[slot].length;
      const isOpen = this.state.openSkinMenu === slot;
      return `
        <button
          type="button"
          class="character-wardrobe__slot${isOpen ? ' character-wardrobe__slot--open' : ''}"
          data-skin-slot="${slot}"
          aria-expanded="${isOpen}"
        >
          <span class="character-wardrobe__slot-label">${label}</span>
          <span class="character-wardrobe__slot-value">${value}</span>
          <span class="character-wardrobe__slot-owned">${ownedCount} peças</span>
        </button>
      `;
    }).join('');
  }

  private renderSkinDropdown(): string {
    const slot = this.state.openSkinMenu;
    if (!slot) {
      return '<div class="character-wardrobe__menu character-wardrobe__menu--hidden" data-skin-menu hidden></div>';
    }

    const owned = this.state.skinState.ownedSkins[slot];
    const current = this.state.skinState.skin[slot];

    return `
      <div class="character-wardrobe__menu" data-skin-menu role="listbox">
        <p class="character-wardrobe__menu-title">${SKIN_SLOT_LABELS[slot]} — possuídas</p>
        <ul class="character-wardrobe__menu-list">
          ${owned.map((optionId) => `
            <li>
              <button
                type="button"
                class="character-wardrobe__menu-item${optionId === current ? ' character-wardrobe__menu-item--active' : ''}"
                data-skin-slot="${slot}"
                data-skin-option="${optionId}"
                role="option"
              >
                ${getSkinOptionLabel(slot, optionId)}
              </button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  private renderPvp(profile: PlayerProfileSnapshot): string {
    const rows = [
      ['Batalhas', profile.pvp.battles],
      ['Vitórias', profile.pvp.wins],
      ['Derrotas', profile.pvp.losses],
    ] as const;
    return rows.map(([label, value]) => `
      <li class="character-pvp-row">
        <span>${label}</span>
        <strong>${value}</strong>
      </li>
    `).join('');
  }

  private refreshProfileBlock(): void {
    this.syncExplorationSpeedFromEquipment();

    const progressionSection = this.query<HTMLElement>('[data-level-progression-section]');
    if (progressionSection) {
      patchLevelProgressionSection(progressionSection, this.buildLevelProgressionModel());
    }

    const { profile } = this.state;

    const pvp = this.query<HTMLElement>('[data-pvp-grid]');
    if (pvp) pvp.innerHTML = this.renderPvp(profile);
  }

  private renderEquipmentGrid(equipment: EquipmentUiGridState): string {
    const store = getPlayerEquipmentStore();
    return EQUIPMENT_UI_SLOT_ORDER.map((slotId) => {
      const itemId = equipment[slotId];
      const label = EQUIPMENT_UI_SLOT_LABELS[slotId];
      const name = itemId ? store.getItemDisplayName(itemId) : '—';
      return `
        <li class="character-equip-slot${itemId ? ' character-equip-slot--filled' : ''}" data-equip-slot="${slotId}">
          <span class="character-equip-slot__code">${label}</span>
          <span class="character-equip-slot__item">${name}</span>
        </li>
      `;
    }).join('');
  }

  private refreshPreview(): void {
    const canvas = this.query<HTMLCanvasElement>('[data-char-preview]');
    if (canvas) paintCharacterPanelPreview(canvas, this.state.skinState.skin);
  }

  private toggleSkinMenu(slot: SkinSlotId): void {
    this.state = {
      ...this.state,
      openSkinMenu: this.state.openSkinMenu === slot ? null : slot,
    };
    this.refreshSkinSlots();
    this.refreshSkinMenu();
  }

  private refreshSkinSlots(): void {
    const container = this.query<HTMLElement>('.character-wardrobe__slots');
    if (container) container.innerHTML = this.renderSkinSlots();
  }

  private refreshSkinMenu(): void {
    const host = this.query<HTMLElement>('.character-wardrobe');
    const existing = this.query<HTMLElement>('[data-skin-menu]');
    if (!host) return;
    const html = this.renderSkinDropdown();
    if (existing) existing.outerHTML = html;
    else host.insertAdjacentHTML('beforeend', html);
  }

  private refreshEquipmentGrid(): void {
    const grid = this.query<HTMLElement>('[data-equip-grid]');
    if (grid) grid.innerHTML = this.renderEquipmentGrid(this.state.equipmentGrid);
    const meta = this.query<HTMLElement>('.character-sheet__sprite-meta');
    if (meta) {
      meta.textContent = formatSpriteMetaLine(
        this.state.equipmentMeta.displayName,
        this.state.equipmentMeta.level,
        this.state.equipmentMeta.classId,
      );
    }
  }

  private buildLevelProgressionModel() {
    const { profile, equipmentMeta, speedBonusTotal, isEncumbered } = this.state;
    return {
      profile,
      classId: equipmentMeta.classId,
      vitals: equipmentMeta.vitals,
      speedBonusTotal,
      isEncumbered,
    };
  }

  private syncExplorationSpeedFromEquipment(): void {
    const statsBonus = calculateStatsBonusFromEquipment(this.state.equipmentGrid);
    this.state = {
      ...this.state,
      statsBonus,
      speedBonusTotal: resolveExplorationSpeedBonusFromAgility(statsBonus.agilidade),
      isEncumbered: getCarryCapacityStore().isEncumbered(),
    };
  }

  private async loadEventLog(): Promise<void> {
    const creds = resolveWorldLoreCredentials();

    try {
      await fetchWorldChronicles({
        playerId: creds.playerId,
        characterId: creds.characterId,
      });
    } catch {
      // Mock local ou timeout — usa entradas disponíveis offline.
    }

    this.eventLogLines = buildOperativeEventLogLines(resolveWorldLoreEntriesForClient());
    this.refreshEventLog();
  }

  private refreshSyncIndicator(): void {
    const host = this.query<HTMLElement>('[data-sync-indicator]');
    if (!host) return;

    const { label, stable, signalBars, mapLabel } = this.syncStatus;
    host.classList.toggle('character-sync--unstable', !stable);
    host.setAttribute('aria-label', `Sincronia: ${label} — ${mapLabel}`);

    const statusEl = this.query<HTMLElement>('[data-sync-status]');
    if (statusEl) statusEl.textContent = label;

    const barsEl = this.query<HTMLElement>('[data-sync-bars]');
    if (barsEl) barsEl.innerHTML = renderSyncSignalBars(signalBars);
  }

  private refreshWalletBlock(): void {
    const wallet = getDataStore().getWallet();
    const vlt = this.query<HTMLElement>('[data-wallet-vlt]');
    const alt = this.query<HTMLElement>('[data-wallet-alt]');
    if (vlt) vlt.textContent = wallet.voltsFormatted;
    if (alt) alt.textContent = wallet.alterFormatted;
  }

  private resolveEstiloOnOpen(): void {
    const dataStore = getDataStore();
    this.resolvedEstiloName = resolveEstiloName(
      getGlobalPlayerStore().getConfirmedLoadout(),
      dataStore.getMarcosState(),
    );
    if (this.root) patchEstiloLine(this.root, this.resolvedEstiloName);
  }

  private refreshEventLog(): void {
    const list = this.query<HTMLElement>('[data-event-log-list]');
    if (list) list.innerHTML = renderOperativeEventLog(this.eventLogLines);
  }
}

/** Alias público solicitado — CharacterPanel. */
export const CharacterPanel = CharactersPanel;

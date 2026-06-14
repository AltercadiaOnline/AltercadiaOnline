import {
  EquipmentUiSlotId,
  EQUIPMENT_UI_SLOT_LABELS,
  EQUIPMENT_UI_SLOT_ORDER,
} from '../../../shared/character/equipmentUiSlots.js';
import { getPlayerEquipmentStore, type PlayerEquipmentSnapshot } from '../equipment/playerEquipmentStore.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import {
  hasPendingItemMutation,
  isEquipSlotMutationPending,
  subscribeItemMutationPending,
} from '../items/itemMutationPendingUi.js';
import { dispatchUnequipFromSlot } from '../equipment/equipItemAction.js';
import {
  getCarryCapacityStore,
  type CarryCapacitySnapshot,
} from '../capacity/carryCapacityStore.js';
import { getPlayerProfileStore } from '../character/playerProfileStore.js';
import type { PlayerProfileSnapshot } from '../../../shared/character/playerProfile.js';
import type { CharacterLevelXpBarView } from '../../../shared/character/characterLevelProgression.js';
import {
  patchSidebarLevelProgression,
  renderSidebarLevelProgression,
} from '../character/levelProgressionSection.js';
import { resolveLoadoutPpBudget } from '../../../shared/combat/loadoutPpBudget.js';
import { getGlobalPlayerStore } from '../moveset/globalPlayerStore.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { getContextMenuService } from '../contextMenu/ContextMenuService.js';

/**
 * Sidebar fixa à direita — status vital + progressão de nível + grade de 10 slots (SET).
 * Grade SET: sem cache de itens — innerHTML reconstruído a partir de getEquippedItems().
 */
export class EquipmentSidebar {
  private readonly root: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly levelEl: HTMLElement;
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly ppFill: HTMLElement;
  private readonly ppText: HTMLElement;
  private readonly capFill: HTMLElement;
  private readonly capText: HTMLElement;
  private readonly progressionEl: HTMLElement;
  private readonly gridEl: HTMLElement;
  private readonly setTitleEl: HTMLElement | null;
  private unsubscribe: (() => void) | null = null;
  private unsubscribeItems: (() => void) | null = null;
  private unsubscribePending: (() => void) | null = null;
  private unsubscribeCapacity: (() => void) | null = null;
  private unsubscribeProfile: (() => void) | null = null;
  private unsubscribeLoadout: (() => void) | null = null;
  private unbindTooltipListeners: (() => void) | null = null;
  private unbindDismissContextMenu: (() => void) | null = null;

  private constructor(root: HTMLElement) {
    this.root = root;
    this.nameEl = root.querySelector('[data-equip-name]')!;
    this.levelEl = root.querySelector('[data-equip-level]')!;
    this.hpFill = root.querySelector('[data-hp-fill]')!;
    this.hpText = root.querySelector('[data-hp-text]')!;
    this.ppFill = root.querySelector('[data-pp-fill]')!;
    this.ppText = root.querySelector('[data-pp-text]')!;
    this.capFill = root.querySelector('[data-cap-fill]')!;
    this.capText = root.querySelector('[data-cap-text]')!;
    this.progressionEl = root.querySelector('[data-equip-progression]')!;
    this.gridEl = root.querySelector('[data-equip-grid]')!;
    this.setTitleEl = root.querySelector('.equipment-sidebar__set-title');
    this.bindSetGridInteraction();
    this.bindDismissContextMenuOnLeftClick();
  }

  static mount(host: HTMLElement): EquipmentSidebar {
    host.innerHTML = EquipmentSidebar.createStaticShell();
    host.classList.add('equipment-sidebar');
    return new EquipmentSidebar(host);
  }

  /** Shell estático — vitals/progressão; grade SET é preenchida em renderSetGrid(). */
  static createStaticShell(): string {
    const profile = getPlayerProfileStore().getSnapshot();

    return `
      <header class="equipment-sidebar__header">
        <p class="equipment-sidebar__name" data-equip-name>Operative</p>
        <p class="equipment-sidebar__level" data-equip-level>Nível ${profile.level}</p>
      </header>

      <section class="equipment-sidebar__vitals" aria-label="Status vital">
        <div class="vital-row">
          <span class="vital-label">HP</span>
          <div class="vital-bar vital-bar--hp" role="progressbar" aria-label="Vida">
            <div class="vital-bar__fill" data-hp-fill style="width:100%"></div>
          </div>
          <span class="vital-value" data-hp-text>—</span>
        </div>
        <div class="vital-row">
          <span class="vital-label">PP</span>
          <div class="vital-bar vital-bar--pp" role="progressbar" aria-label="Pontos de poder">
            <div class="vital-bar__fill" data-pp-fill style="width:100%"></div>
          </div>
          <span class="vital-value" data-pp-text>—</span>
        </div>
        <div class="vital-row vital-row--cap">
          <span class="vital-label">CAP</span>
          <div class="vital-bar vital-bar--cap" role="progressbar" aria-label="Capacidade de carga">
            <div class="vital-bar__fill" data-cap-fill style="width:0%"></div>
          </div>
          <span class="vital-value" data-cap-text>0.0 / 0.0</span>
        </div>
      </section>

      <section class="equipment-sidebar__progression" aria-label="Progressão de Nível">
        <h2 class="equipment-sidebar__stats-title">Progressão de Nível</h2>
        <div data-equip-progression>
          ${renderSidebarLevelProgression(profile)}
        </div>
      </section>

      <section class="equipment-sidebar__set" aria-label="Equipamentos">
        <h2 class="equipment-sidebar__set-title">SET</h2>
        <div class="equip-grid" data-equip-grid></div>
      </section>
    `;
  }

  attach(): void {
    const equipmentStore = getPlayerEquipmentStore();
    const profileStore = getPlayerProfileStore();
    const itemStore = getPlayerItemStore();

    this.unsubscribe = equipmentStore.subscribe((snapshot) => this.renderVitals(snapshot));

    this.unsubscribeItems = itemStore.subscribe(() => {
      this.renderSetGrid();
    });

    this.unsubscribePending = subscribeItemMutationPending(() => {
      this.renderSetGrid();
    });

    this.unsubscribeCapacity = getCarryCapacityStore().subscribe((cap) => {
      this.renderCapacity(cap);
    });

    this.unsubscribeProfile = profileStore.subscribe((profile) => {
      this.renderLevelProgression(profile);
      this.nameEl.textContent = profile.displayName;
    });

    this.unsubscribeLoadout = getGlobalPlayerStore().subscribe(() => {
      this.renderPpFromLoadout();
    });

    this.renderVitals(equipmentStore.getSnapshot());
    this.renderSetGrid();
    this.renderLevelProgression(profileStore.getSnapshot());
    this.renderPpFromLoadout();
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.unsubscribeItems?.();
    this.unsubscribeItems = null;
    this.unsubscribePending?.();
    this.unsubscribePending = null;
    this.unsubscribeCapacity?.();
    this.unsubscribeCapacity = null;
    this.unsubscribeProfile?.();
    this.unsubscribeProfile = null;
    this.unsubscribeLoadout?.();
    this.unsubscribeLoadout = null;
    this.unbindTooltipListeners?.();
    this.unbindTooltipListeners = null;
    this.unbindDismissContextMenu?.();
    this.unbindDismissContextMenu = null;
  }

  /** Reconstrói grade SET inteira — lê getEquippedItems() no momento do render. */
  private renderSetGrid(): void {
    this.unbindTooltipListeners?.();
    this.unbindTooltipListeners = null;

    this.gridEl.innerHTML = this.buildSetGridHtml();

    if (this.setTitleEl) {
      const syncMark = hasPendingItemMutation()
        ? ' <span class="equipment-sidebar__sync" aria-busy="true" title="Sincronizando…">⟳</span>'
        : '';
      this.setTitleEl.innerHTML = `SET${syncMark}`;
    }

    this.bindSetGridTooltips();
  }

  private buildSetGridHtml(): string {
    const equippedItems = getPlayerItemStore().getEquippedItems();
    const displayStore = getPlayerEquipmentStore();

    return EQUIPMENT_UI_SLOT_ORDER.map((slotId) => {
      const label = EQUIPMENT_UI_SLOT_LABELS[slotId];
      const row = equippedItems.find((item) => item.slot === slotId);
      const itemId = row?.itemId ?? null;
      const pending = isEquipSlotMutationPending(slotId);
      const pendingClass = pending ? ' equip-slot--pending' : '';
      const pendingAttrs = pending ? ' aria-busy="true" disabled' : '';

      if (!itemId) {
        return `
          <button
            type="button"
            class="equip-slot${pendingClass}"
            data-equip-slot="${slotId}"
            aria-label="${label}"
            title="${label}"${pendingAttrs}
          >
            <span class="equip-slot__placeholder">${label}</span>
            <span class="equip-slot__icon" hidden></span>
            <span class="equip-slot__name" hidden></span>
            ${pending ? '<span class="equip-slot__pending" aria-hidden="true">⟳</span>' : ''}
          </button>
        `;
      }

      const displayName = displayStore.getItemDisplayName(itemId);
      const contextMenuTarget = JSON.stringify({ slotId });
      return `
        <button
          type="button"
          class="equip-slot equip-slot--filled${pendingClass}"
          data-equip-slot="${slotId}"
          data-item-id="${itemId}"
          data-context-menu-kind="equip-slot"
          data-context-menu-target='${contextMenuTarget}'
          aria-label="${displayName}"${pendingAttrs}
        >
          <span class="equip-slot__placeholder" hidden>${label}</span>
          <span class="equip-slot__icon">${itemId.slice(0, 2).toUpperCase()}</span>
          <span class="equip-slot__name">${displayName}</span>
          ${pending ? '<span class="equip-slot__pending" aria-hidden="true">⟳</span>' : ''}
        </button>
      `;
    }).join('');
  }

  private bindSetGridInteraction(): void {
    this.gridEl.addEventListener('dblclick', (event) => {
      if (hasPendingItemMutation()) return;

      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-equip-slot]');
      const slotId = button?.dataset.equipSlot as EquipmentUiSlotId | undefined;
      if (!slotId) return;
      if (isEquipSlotMutationPending(slotId)) return;

      const row = getPlayerItemStore().getItemInSlot(slotId);
      if (!row) return;

      dispatchUnequipFromSlot(slotId);
    });
  }

  private bindSetGridTooltips(): void {
    const cleanups: Array<() => void> = [];
    const buttons = this.gridEl.querySelectorAll<HTMLButtonElement>('[data-equip-slot][data-item-id]');

    for (const button of buttons) {
      const onEnter = (event: MouseEvent): void => {
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = getItemById(itemId);
        if (!item) return;

        uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
          data: { kind: 'item', data: item },
          x: event.clientX,
          y: event.clientY,
        });
      };

      const onLeave = (): void => {
        uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
      };

      button.addEventListener('mouseenter', onEnter);
      button.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        button.removeEventListener('mouseenter', onEnter);
        button.removeEventListener('mouseleave', onLeave);
      });
    }

    this.unbindTooltipListeners = () => {
      for (const off of cleanups) off();
      uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
    };
  }

  private bindDismissContextMenuOnLeftClick(): void {
    const dismiss = (event: MouseEvent): void => {
      if (event.button !== 0) return;
      getContextMenuService().close();
    };

    this.root.addEventListener('mousedown', dismiss);
    this.unbindDismissContextMenu = () => {
      this.root.removeEventListener('mousedown', dismiss);
    };
  }

  private renderVitals(snapshot: PlayerEquipmentSnapshot): void {
    this.nameEl.textContent = snapshot.displayName;
    this.levelEl.textContent = `Nível ${snapshot.level}`;

    const { vitals } = snapshot;
    const hpPct = vitals.hpMax > 0 ? (vitals.hpCurrent / vitals.hpMax) * 100 : 0;
    this.hpFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${vitals.hpCurrent}/${vitals.hpMax}`;
    this.renderPpFromLoadout();
  }

  private renderPpFromLoadout(): void {
    const loadout = getGlobalPlayerStore().getConfirmedLoadout();
    const { ppCurrent, ppMax } = resolveLoadoutPpBudget(loadout);
    const pct = ppMax > 0 ? (ppCurrent / ppMax) * 100 : 0;
    this.ppFill.style.width = `${pct}%`;
    this.ppText.textContent = ppMax > 0 ? `${ppCurrent}/${ppMax}` : '—';
    const bar = this.ppFill.parentElement;
    if (bar) {
      bar.setAttribute('aria-valuenow', String(ppCurrent));
      bar.setAttribute('aria-valuemax', String(ppMax));
    }
  }

  private renderLevelProgression(profile: PlayerProfileSnapshot): void {
    this.refreshLevelXpBar(profile);
  }

  /** Atualiza barra de XP com teto de getRequiredXpForNextLevel(level). */
  refreshLevelXpBar(profile: PlayerProfileSnapshot, barView?: CharacterLevelXpBarView): void {
    patchSidebarLevelProgression(this.progressionEl, profile, barView);
    this.levelEl.textContent = `Nível ${profile.level}`;
  }

  private renderCapacity(cap: CarryCapacitySnapshot): void {
    const pct = cap.maxWeight > 0
      ? Math.min(100, (cap.currentWeight / cap.maxWeight) * 100)
      : 0;
    this.capFill.style.width = `${pct}%`;
    this.capText.textContent = cap.formatted;

    this.capFill.classList.remove('vital-bar__fill--warning', 'vital-bar__fill--overload');
    this.capText.classList.remove('vital-value--warning', 'vital-value--overload');

    if (cap.visualLevel === 'overload') {
      this.capFill.classList.add('vital-bar__fill--overload');
      this.capText.classList.add('vital-value--overload');
    } else if (cap.visualLevel === 'warning') {
      this.capFill.classList.add('vital-bar__fill--warning');
      this.capText.classList.add('vital-value--warning');
    }
  }
}

let activeSidebar: EquipmentSidebar | null = null;

export function initEquipmentSidebar(): EquipmentSidebar {
  const host = document.getElementById('equipment-sidebar');
  if (!host) {
    throw new Error('[UI] #equipment-sidebar não encontrado.');
  }

  if (!activeSidebar) {
    activeSidebar = EquipmentSidebar.mount(host);
    activeSidebar.attach();
  }

  return activeSidebar;
}

export function getEquipmentSidebar(): EquipmentSidebar | null {
  return activeSidebar;
}

export function destroyEquipmentSidebar(): void {
  activeSidebar?.detach();
  activeSidebar = null;
}

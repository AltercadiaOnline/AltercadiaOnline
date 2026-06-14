import { BaseUIComponent } from '../UIComponent.js';
import { windowManager } from '../WindowManager.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getPlayerPetStore } from '../pet/playerPetStore.js';
import type { PlayerPetRosterSnapshot } from '../../../shared/pet/petRoster.js';
import { isRosterSelectionOnlyChange } from '../../../shared/pet/petRoster.js';
import {
  renderPetLoveActivateControl,
  renderPetLoveRosterDetail,
  renderPetLoveRosterHud,
} from '../pet/petLoveRosterView.js';
import { renderPetLoveRationControls } from '../pet/petLoveView.js';
import { formatPetAffectionCooldown } from '../../../shared/pet/petAffection.js';
import { postSystemNotification } from '../logService.js';
import { applyHudDynamicLayout } from '../layout/hudDynamicLayout.js';

const AFFECTION_COOLDOWN_TICK_MS = 30_000;

/** HUD dedicada Pet Love — até 3 companheiros; ativação aqui. */
export class PetLovePanel extends BaseUIComponent {
  private roster: PlayerPetRosterSnapshot = getPlayerPetStore().getRoster();
  private rationCharges = getPlayerPetStore().getRationCharges();
  private feedInlineError: string | null = null;
  private unsubRoster: (() => void) | null = null;
  private unsubRationCharges: (() => void) | null = null;
  private affectionCooldownTimer: ReturnType<typeof setInterval> | null = null;
  private rationCooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({
      id: 'petLove',
      rootClassName: 'ui-panel ui-panel--pet-love ui-panel--movable',
    });
  }

  protected override shouldUseDynamicLayout(): boolean {
    return true;
  }

  protected override getDynamicLayoutOptions() {
    return {
      fitRootSelector: '[data-hud-fit-root]',
      secondarySelector: '[data-hud-fit-secondary]',
    };
  }

  protected override onOpen(): void {
    this.roster = getPlayerPetStore().getRoster();
    this.rationCharges = getPlayerPetStore().getRationCharges();
    this.feedInlineError = null;
    this.unsubRoster = getPlayerPetStore().subscribeRoster((next) => {
      const previous = this.roster;
      this.roster = next;
      if (!this.isOpen()) return;
      if (isRosterSelectionOnlyChange(previous, next)) {
        this.feedInlineError = null;
        this.patchRosterSelection(next);
        return;
      }
      this.render();
    });
    this.startAffectionCooldownTicker();
    this.startRationCooldownTicker();
    this.unsubRationCharges = getPlayerPetStore().subscribeRationCharges((charges) => {
      this.rationCharges = charges;
      if (!this.isOpen()) return;
      if (this.feedInlineError?.includes('Sem cargas') && charges > 0) {
        this.feedInlineError = null;
      }
      this.patchRationControls();
    });
  }

  protected override onClose(): void {
    this.unsubRoster?.();
    this.unsubRoster = null;
    this.unsubRationCharges?.();
    this.unsubRationCharges = null;
    this.stopAffectionCooldownTicker();
    this.stopRationCooldownTicker();
  }

  createTemplate(): string {
    const feedAvailability = getPlayerPetStore().getPetRationFeedAvailability();
    return `
      <header class="ui-panel__header pet-love-panel__header" data-panel-drag-handle>
        <div class="pet-love-panel__header-main">
          <span class="pet-love-panel__tag">COMPANHEIRO // PET LOVE</span>
          <h2 class="ui-panel__title">Pet Love</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Pet Love">×</button>
      </header>
      <div class="ui-panel__body pet-love-panel__body">
        ${renderPetLoveRosterHud(this.roster, feedAvailability, this.rationCharges, this.feedInlineError)}
        <div class="pet-love-panel__actions">
          <div class="pet-love-panel__actions-col">
            ${renderPetLoveActivateControl(this.roster, this.roster.pets[this.roster.selectedSlotIndex] ?? null)}
          </div>
          ${this.renderAffectionActions()}
        </div>
      </div>
    `;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        windowManager.close('petLove');
        return;
      }

      const slotButton = target.closest<HTMLElement>('[data-pet-slot]');
      const slotRaw = slotButton?.dataset.petSlot;
      const slotIndex = slotRaw !== undefined ? Number(slotRaw) : Number.NaN;

      if (target.dataset.action === 'pet-select-slot' && Number.isFinite(slotIndex)) {
        getPlayerPetStore().selectPetSlot(slotIndex);
        return;
      }

      if (target.dataset.action === 'pet-activate' && Number.isFinite(slotIndex)) {
        const store = getPlayerPetStore();
        if (store.activatePetSlot(slotIndex)) {
          const pet = store.getRoster().pets[slotIndex];
          postSystemNotification(
            pet ? `${pet.name} está convocado.` : 'Companheiro ativado.',
            'normal',
          );
        }
        return;
      }

      if (target.dataset.action === 'pet-deactivate') {
        getPlayerPetStore().deactivateAllPets();
        postSystemNotification('Companheiro guardado.', 'normal');
        return;
      }

      if (target.dataset.action === 'pet-affection') {
        this.handlePetAffection();
        return;
      }

      if (target.dataset.action === 'pet-feed-ration') {
        const result = getActionDispatcher().dispatch({
          type: 'PET_FEED_SPECIAL_RATION',
          payload: { slotIndex: this.roster.selectedSlotIndex },
        });
        if (!result.ok) {
          if (result.reason.includes('Sem cargas')) {
            this.feedInlineError = result.reason;
            this.patchRationControls();
          } else {
            postSystemNotification(result.reason, 'normal');
          }
        } else {
          this.feedInlineError = null;
          this.patchRationControls();
        }
        if (this.isOpen()) {
          this.startRationCooldownTicker();
        }
      }
    });
  }

  override destroy(): void {
    this.stopAffectionCooldownTicker();
    this.stopRationCooldownTicker();
    super.destroy();
  }

  private patchRosterSelection(roster: PlayerPetRosterSnapshot): void {
    if (!this.root) return;

    for (const tab of this.root.querySelectorAll<HTMLElement>('[data-pet-slot]')) {
      const slotIndex = Number(tab.dataset.petSlot);
      if (!Number.isFinite(slotIndex)) continue;
      const selected = roster.selectedSlotIndex === slotIndex;
      tab.classList.toggle('pet-love-roster__tab--selected', selected);
      tab.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }

    const detail = this.root.querySelector('.pet-love-roster__detail');
    const feedAvailability = getPlayerPetStore().getPetRationFeedAvailability();
    if (detail) {
      detail.innerHTML = renderPetLoveRosterDetail(
        roster,
        feedAvailability,
        this.rationCharges,
        this.feedInlineError,
      );
    }

    const activateCol = this.root.querySelector('.pet-love-panel__actions-col:not(.pet-love-panel__actions-col--right)');
    const selectedPet = roster.pets[roster.selectedSlotIndex] ?? null;
    if (activateCol) {
      activateCol.innerHTML = renderPetLoveActivateControl(roster, selectedPet);
    }

    const affectionCol = this.root.querySelector('[data-pet-affection-col]');
    if (affectionCol) {
      affectionCol.outerHTML = this.renderAffectionActions().trim();
    }

    applyHudDynamicLayout(this.root, this.getDynamicLayoutOptions());
  }

  private patchRationControls(): void {
    if (!this.root) return;
    const pet = this.roster.pets[this.roster.selectedSlotIndex] ?? null;
    const row = this.root.querySelector('[data-pet-ration-row]');
    if (!row || !pet) return;

    row.outerHTML = renderPetLoveRationControls({
      rationCharges: this.rationCharges,
      canFeedPet: pet.hpCurrent > 0,
      feedAvailability: getPlayerPetStore().getPetRationFeedAvailability(),
      inlineError: this.feedInlineError,
    }).trim();
  }

  private renderAffectionActions(): string {
    const pet = this.roster.pets[this.roster.selectedSlotIndex];
    if (!pet) {
      return `
        <div
          class="pet-love-panel__actions-col pet-love-panel__actions-col--right"
          data-pet-affection-col
        >
          <p class="pet-love-panel__actions-placeholder">Selecione um companheiro para carinho.</p>
        </div>
      `;
    }

    const store = getPlayerPetStore();
    const availability = store.getPetAffectionAvailability();
    const petName = pet.name;
    const label = `Fazer carinho em ${petName}`;

    if (availability.canAffect) {
      return `
        <div
          class="pet-love-panel__actions-col pet-love-panel__actions-col--right"
          data-pet-affection-col
        >
          <button
            type="button"
            class="pet-love-panel__affection-btn"
            data-action="pet-affection"
            aria-label="${label}"
          >
            ${label}
          </button>
        </div>
      `;
    }

    const cooldownLabel = formatPetAffectionCooldown(availability.remainingMs);
    return `
      <div
        class="pet-love-panel__actions-col pet-love-panel__actions-col--right"
        data-pet-affection-col
      >
        <button
          type="button"
          class="pet-love-panel__affection-btn pet-love-panel__affection-btn--cooldown"
          data-action="pet-affection"
          disabled
          aria-label="${label} — disponível em ${cooldownLabel}"
        >
          ${label}
        </button>
        <p class="pet-love-panel__affection-hint">Próximo carinho em ${cooldownLabel}</p>
      </div>
    `;
  }

  private handlePetAffection(): void {
    const result = getPlayerPetStore().applyPetAffection();
    if (!result.ok) {
      const cooldown = formatPetAffectionCooldown(result.remainingMs);
      postSystemNotification(
        cooldown
          ? `Você já fez carinho. Próximo em ${cooldown}.`
          : result.reason,
        'normal',
      );
      if (this.isOpen()) this.render();
      return;
    }

    const petName = this.roster.pets[this.roster.selectedSlotIndex]?.name ?? 'seu pet';
    postSystemNotification(
      `Carinho em ${petName}! +${(result.xpGained * 100).toFixed(2)}% de afinidade.`,
      'normal',
    );
    if (this.isOpen()) this.render();
  }

  private startAffectionCooldownTicker(): void {
    this.stopAffectionCooldownTicker();
    this.affectionCooldownTimer = setInterval(() => {
      if (!this.isOpen()) return;
      const availability = getPlayerPetStore().getPetAffectionAvailability();
      if (availability.canAffect) {
        this.render();
        this.stopAffectionCooldownTicker();
        return;
      }
      const affectionCol = this.root?.querySelector('[data-pet-affection-col]');
      if (affectionCol) {
        affectionCol.outerHTML = this.renderAffectionActions().trim();
      }
    }, AFFECTION_COOLDOWN_TICK_MS);
  }

  private stopAffectionCooldownTicker(): void {
    if (this.affectionCooldownTimer !== null) {
      clearInterval(this.affectionCooldownTimer);
      this.affectionCooldownTimer = null;
    }
  }

  private startRationCooldownTicker(): void {
    this.stopRationCooldownTicker();
    this.rationCooldownTimer = setInterval(() => {
      if (!this.isOpen()) return;
      const availability = getPlayerPetStore().getPetRationFeedAvailability();
      if (availability.canFeed) {
        this.patchRationControls();
        this.stopRationCooldownTicker();
        return;
      }
      this.patchRationControls();
    }, AFFECTION_COOLDOWN_TICK_MS);
  }

  private stopRationCooldownTicker(): void {
    if (this.rationCooldownTimer !== null) {
      clearInterval(this.rationCooldownTimer);
      this.rationCooldownTimer = null;
    }
  }
}

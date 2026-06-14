import { ACTIVE_MOVESET_SLOT_COUNT } from '../../../shared/combat/moveTypes.js';
import { resolveMoveDefinitionForUi } from '../../../shared/combat/movesetLoadout.js';
import { formatCombatClassLabel } from '../../../shared/character/combatClassDisplay.js';
import type { ClassType } from '../../../shared/types/classes.js';
import type { MovesProgressionSnapshot } from '../../../shared/playerDataSnapshots.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { BaseUIComponent } from '../UIComponent.js';
import { getPlayerEquipmentStore } from '../equipment/playerEquipmentStore.js';
import {
  getGlobalPlayerStore,
  type GlobalPlayerSnapshot,
} from '../moveset/globalPlayerStore.js';
import { resolveMoveProgressionForChar } from '../../../shared/progression/moveMasteryCap.js';
import { totalMasteryXpFromSnapshot } from '../../../shared/progression/moveProgression.js';
import {
  buildMoveMasteryProgressionTooltip,
  resolveProgressionPercent,
} from '../../../shared/progression/progressionTooltipContent.js';
import { renderProgressionTooltipAttrs } from '../tooltip/progressionTooltipAttrs.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

const LOADOUT_CONFIRM_SUCCESS_MS = 1500;

/**
 * HUD de configuração de loadout — deck building (6 pool → 4 ativos) antes da batalha.
 */
export class MovesetLoadoutHUD extends BaseUIComponent {
  private snapshot: GlobalPlayerSnapshot = getGlobalPlayerStore().getSnapshot();
  private classId: ClassType = getPlayerEquipmentStore().getSnapshot().classId;
  private movesProgression: MovesProgressionSnapshot = getDataStore().getMovesProgression();
  private characterLevel = getDataStore().getCharacterLevel().level;
  private unsubscribeStore: (() => void) | null = null;
  private unsubscribeEquipment: (() => void) | null = null;
  private unsubscribeProgression: (() => void) | null = null;
  private unsubscribeCharacterLevel: (() => void) | null = null;
  private unbindTooltipListeners: (() => void) | null = null;
  private confirmFeedbackActive = false;
  private confirmInFlight = false;
  private confirmFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({
      id: 'moveset',
      rootClassName: 'ui-panel ui-panel--moveset ui-panel--loadout ui-panel--movable',
    });
    this.unsubscribeStore = getGlobalPlayerStore().subscribe((next) => {
      this.snapshot = next;
      if (this.isOpen() && !this.confirmFeedbackActive && !this.confirmInFlight) {
        this.render();
      }
    });
    this.unsubscribeEquipment = getPlayerEquipmentStore().subscribe((next) => {
      this.classId = next.classId;
      if (this.isOpen() && !this.confirmFeedbackActive && !this.confirmInFlight) {
        this.render();
      }
    });
    this.unsubscribeProgression = getDataStore().subscribe('movesProgression', (next) => {
      this.movesProgression = next;
      if (this.isOpen() && !this.confirmFeedbackActive && !this.confirmInFlight) {
        this.render();
      }
    });
    this.unsubscribeCharacterLevel = getDataStore().subscribe('characterLevel', (next) => {
      this.characterLevel = next.level;
      if (this.isOpen() && !this.confirmFeedbackActive && !this.confirmInFlight) {
        this.render();
      }
    });
  }

  protected override onOpen(): void {
    this.clearConfirmFeedback();
    getGlobalPlayerStore().beginLoadoutEdit();
    this.snapshot = getGlobalPlayerStore().getSnapshot();
    this.classId = getPlayerEquipmentStore().getSnapshot().classId;
    this.movesProgression = getDataStore().getMovesProgression();
    this.characterLevel = getDataStore().getCharacterLevel().level;
    this.render();
  }

  protected override onClose(): void {
    this.clearConfirmFeedback();
  }

  createTemplate(): string {
    const activeCount = this.snapshot.activeMovesets.length;
    const canConfirm = activeCount === ACTIVE_MOVESET_SLOT_COUNT;
    const confirmLabel = this.confirmFeedbackActive ? 'LOADOUT CONFIRMADO!' : 'CONFIRMAR LOADOUT';
    const confirmDisabled = !canConfirm || this.confirmFeedbackActive || this.confirmInFlight;
    const confirmClass = this.confirmFeedbackActive
      ? 'loadout-confirm-btn loadout-confirm-btn--success'
      : 'loadout-confirm-btn';
    const classLabel = formatCombatClassLabel(this.classId);

    return `
      <header class="ui-panel__header" data-panel-drag-handle>
        <div>
          <span class="loadout-hud__tag">CONFIG // BATALHA</span>
          <div class="loadout-hud__title-row">
            <h2 class="ui-panel__title">Moveset Loadout</h2>
            <span class="loadout-hud__class" aria-label="Classe do personagem">${classLabel}</span>
          </div>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Moveset">×</button>
      </header>
      <div class="ui-panel__body ui-panel__body--loadout">
        <section class="loadout-section" aria-label="Pool de movimentos">
          <h3 class="loadout-section__title">Coleção (${this.snapshot.availableMoveIds.length})</h3>
          <p class="loadout-section__hint">Clique para equipar · clique novamente para remover</p>
          <div class="loadout-pool" role="list">
            ${this.renderPool()}
          </div>
        </section>

        <section class="loadout-section loadout-section--active" aria-label="Loadout ativo">
          <h3 class="loadout-section__title">Loadout Ativo (${activeCount}/${ACTIVE_MOVESET_SLOT_COUNT})</h3>
          <div class="loadout-active-slots" role="list">
            ${this.renderActiveSlots()}
          </div>
        </section>

        <footer class="loadout-footer">
          <button
            type="button"
            class="${confirmClass}"
            data-action="confirm-loadout"
            ${confirmDisabled ? 'disabled' : ''}
            aria-live="polite"
          >
            <span class="loadout-confirm-btn__label">${confirmLabel}</span>
          </button>
        </footer>
      </div>
    `;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        this.close();
        return;
      }

      if (target.closest('[data-action="confirm-loadout"]')) {
        void this.handleConfirmLoadout();
        return;
      }

      if (this.confirmFeedbackActive || this.confirmInFlight) return;

      const poolCard = target.closest<HTMLElement>('[data-pool-move]');
      if (poolCard?.dataset.poolMove) {
        getGlobalPlayerStore().toggleActiveMove(poolCard.dataset.poolMove);
        return;
      }

      const activeSlot = target.closest<HTMLElement>('[data-active-move]');
      if (activeSlot?.dataset.activeMove) {
        getGlobalPlayerStore().removeActiveMove(activeSlot.dataset.activeMove);
      }
    });
  }

  private async handleConfirmLoadout(): Promise<void> {
    if (this.confirmFeedbackActive || this.confirmInFlight) return;

    const button = this.query<HTMLButtonElement>('[data-action="confirm-loadout"]');
    if (!button || button.disabled) return;

    this.confirmInFlight = true;
    button.disabled = true;

    const confirmed = await getGlobalPlayerStore().confirmLoadout();
    this.confirmInFlight = false;

    if (!confirmed) {
      this.render();
      return;
    }

    this.showConfirmSuccessFeedback(button);
  }

  private showConfirmSuccessFeedback(button: HTMLButtonElement): void {
    this.confirmFeedbackActive = true;
    button.disabled = true;

    const label = button.querySelector<HTMLElement>('.loadout-confirm-btn__label');
    const applySuccessVisuals = (): void => {
      if (label) label.textContent = 'LOADOUT CONFIRMADO!';
      button.classList.add('loadout-confirm-btn--success');
    };

    if (label) {
      label.style.opacity = '0';
      window.setTimeout(() => {
        applySuccessVisuals();
        void label.offsetWidth;
        label.style.opacity = '1';
      }, 250);
    } else {
      applySuccessVisuals();
    }

    this.confirmFeedbackTimer = setTimeout(() => {
      this.confirmFeedbackActive = false;
      this.confirmFeedbackTimer = null;
      button.classList.remove('loadout-confirm-btn--success');
      if (label) label.style.opacity = '';
      this.close();
    }, LOADOUT_CONFIRM_SUCCESS_MS);
  }

  private clearConfirmFeedback(): void {
    if (this.confirmFeedbackTimer) {
      clearTimeout(this.confirmFeedbackTimer);
      this.confirmFeedbackTimer = null;
    }
    const label = this.query<HTMLElement>('.loadout-confirm-btn__label');
    if (label) label.style.opacity = '';
    this.confirmFeedbackActive = false;
    this.confirmInFlight = false;
  }

  protected override afterRender(): void {
    this.unbindTooltipListeners?.();
    if (!this.root) return;

    const moveElements = this.root.querySelectorAll<HTMLElement>('[data-move-id]');
    const cleanups: Array<() => void> = [];

    for (const element of moveElements) {
      const onEnter = (event: MouseEvent): void => {
        const target = event.target;
        if (target instanceof Element && target.closest('[data-progression-tooltip]')) return;

        const moveId = element.dataset.moveId;
        if (!moveId) return;
        const move = resolveMoveDefinitionForUi(moveId);
        if (!move) return;
        const rect = element.getBoundingClientRect();
        uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
          data: { kind: 'move', data: move },
          x: rect.left + rect.width / 2,
          y: rect.top,
          placement: 'above',
        });
      };
      const onLeave = (): void => {
        uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
      };

      element.addEventListener('mouseenter', onEnter);
      element.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        element.removeEventListener('mouseenter', onEnter);
        element.removeEventListener('mouseleave', onLeave);
      });
    }

    this.unbindTooltipListeners = () => {
      for (const off of cleanups) off();
      uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
    };
  }

  override destroy(): void {
    this.clearConfirmFeedback();
    this.unbindTooltipListeners?.();
    this.unbindTooltipListeners = null;
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    this.unsubscribeEquipment?.();
    this.unsubscribeEquipment = null;
    this.unsubscribeProgression?.();
    this.unsubscribeProgression = null;
    this.unsubscribeCharacterLevel?.();
    this.unsubscribeCharacterLevel = null;
    super.destroy();
  }

  private renderMoveProgress(moveId: string, moveName?: string): string {
    const masteryXp = this.movesProgression.byMoveId[moveId]
      ? this.resolveMasteryXpTotal(moveId)
      : 0;
    const progression = resolveMoveProgressionForChar(moveId, masteryXp, this.characterLevel);
    const capped = progression.masteryCappedForCharLevel === true;
    const pct = capped
      ? 100
      : resolveProgressionPercent(progression.xp, progression.nextLevelThreshold);
    const progressionAttrs = renderProgressionTooltipAttrs(
      buildMoveMasteryProgressionTooltip(moveId, progression, moveName),
    );
    const barClass = capped
      ? 'loadout-card__xp-bar loadout-card__xp-bar--mastery-capped'
      : 'loadout-card__xp-bar';
    const fillClass = capped
      ? 'loadout-card__xp-fill loadout-card__xp-fill--mastery-capped'
      : 'loadout-card__xp-fill';
    const capLabel = capped
      ? '<span class="loadout-card__cap-label">MAX LEVEL PARA NÍVEL ATUAL</span>'
      : '';

    return `
      <div class="loadout-card__progress">
        <span class="loadout-card__level">Nvl. ${progression.level}</span>
        <div
          class="${barClass}"
          role="progressbar"
          ${progressionAttrs}
          aria-valuenow="${capped ? progression.masteryCapLevel ?? progression.level : progression.xp}"
          aria-valuemax="${capped ? progression.masteryCapLevel ?? progression.level : progression.nextLevelThreshold}"
          aria-label="${capped ? 'Domínio no teto para o nível atual' : 'Domínio do movimento'}"
        >
          <div class="${fillClass}" style="width:${pct}%"></div>
        </div>
        ${capLabel}
      </div>
    `;
  }

  private resolveMasteryXpTotal(moveId: string): number {
    const snap = this.movesProgression.byMoveId[moveId];
    if (!snap) return 0;
    return totalMasteryXpFromSnapshot(snap);
  }

  private renderPool(): string {
    return this.snapshot.availableMoveIds.map((moveId) => {
      const move = resolveMoveDefinitionForUi(moveId);
      const label = move?.name ?? moveId;
      const abbrev = label.slice(0, 2).toUpperCase();
      const isActive = this.snapshot.activeMovesets.includes(moveId);

      return `
        <button
          type="button"
          class="loadout-pool-card${isActive ? ' loadout-pool-card--active loadout-pool-card--glow' : ''}"
          role="listitem"
          data-pool-move="${moveId}"
          data-move-id="${moveId}"
          aria-label="${label}${isActive ? ' — equipado' : ''}"
          aria-pressed="${isActive ? 'true' : 'false'}"
        >
          <span class="loadout-pool-card__icon" aria-hidden="true">${abbrev}</span>
          <span class="loadout-pool-card__name">${label}</span>
          ${this.renderMoveProgress(moveId, label)}
        </button>
      `;
    }).join('');
  }

  private renderActiveSlots(): string {
    return Array.from({ length: ACTIVE_MOVESET_SLOT_COUNT }, (_, index) => {
      const moveId = this.snapshot.activeMovesets[index];
      if (!moveId) {
        return `
          <div class="loadout-active-slot loadout-active-slot--empty" role="listitem" aria-label="Slot vazio ${index + 1}">
            <span class="loadout-active-slot__placeholder">${index + 1}</span>
          </div>
        `;
      }

      const move = resolveMoveDefinitionForUi(moveId);
      const label = move?.name ?? moveId;
      const abbrev = label.slice(0, 2).toUpperCase();

      return `
        <button
          type="button"
          class="loadout-active-slot loadout-active-slot--filled loadout-active-slot--glow"
          role="listitem"
          data-active-move="${moveId}"
          data-move-id="${moveId}"
          aria-label="${label} — remover do loadout"
        >
          <span class="loadout-active-slot__icon" aria-hidden="true">${abbrev}</span>
          <span class="loadout-active-slot__name">${label}</span>
          ${this.renderMoveProgress(moveId, label)}
        </button>
      `;
    }).join('');
  }
}
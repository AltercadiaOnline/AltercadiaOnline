import { BaseUIComponent } from '../UIComponent.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getPlayerEquipmentStore } from '../equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore } from '../moveset/globalPlayerStore.js';
import { alertSystem } from '../alertSystem.js';
import { closeAllNpcModals } from '../npcModalController.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import {
  HEAL_VOLT_COST,
  HEAL_FREE_MAX_LEVEL,
  NPC_HEAL_PROVIDER_ANCIAO_CAEL,
  resolveHealVoltsCost,
} from '../../../shared/world/npcHealService.js';
import {
  REFRACTION_BOOTH_CONFIG,
  REFRACTION_BOOTH_INSTRUCTOR_NPC,
} from '../../../shared/cityMinigames/refractionBoothConfig.js';
import type { WorldChroniclesSnapshot } from '../../../shared/world/worldLoreTypes.js';
import {
  consumeChroniclesAbsencePriority,
  fetchWorldChronicles,
} from '../../services/worldLoreClient.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { resolveCaelPetRationQuote } from '../../../shared/economy/caelPetService.js';
import { getPlayerPetStore } from '../pet/playerPetStore.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { openSurvivalGuideCard } from './SurvivalGuideCard.js';
import { hideInteractionCard } from '../../world/interactionCardController.js';
import {
  ActionGatewayButtonController,
  type ActionGatewayButtonOptions,
} from './ActionGatewayButton.js';
import {
  closeReactMovablePanel,
  focusReactMovablePanel,
  isReactMovablePanelEnabled,
  openReactMovablePanel,
} from '../../app/panels/reactMovablePanelBridge.js';
import { tryOpenReactWorldPanel } from '../../app/panels/initWorldPanelsBridge.js';

export type DialogueState = {
  npcId: string;
  npcName: string;
  text: string;
};

/** Janela modal de diálogo — Ancião Cael usa terminal horizontal unificado. */
export class DialoguePanel extends BaseUIComponent {
  private state: DialogueState = {
    npcId: '',
    npcName: '',
    text: '',
  };

  private chroniclesLoading = false;
  private chroniclesError: string | null = null;
  private chroniclesSnapshot: WorldChroniclesSnapshot | null = null;
  /** Mantém trava de mundo ao fechar diálogo e abrir HUD seguinte (ex.: minigame). */
  private preserveWorldHudSession = false;
  /** Evita dupla liberação quando closeAllNpcModals já limpou a sessão. */
  private suppressWorldHudRelease = false;
  private readonly healGateway = new ActionGatewayButtonController(
    () => this.buildHealGatewayOptions(),
  );
  private readonly rationGateway = new ActionGatewayButtonController(
    () => this.buildRationGatewayOptions(),
  );

  constructor() {
    super({
      id: 'dialogue',
      rootClassName: 'ui-panel ui-panel--dialogue',
    });
  }

  override mount(parent: HTMLElement): void {
    if (isReactMovablePanelEnabled()) return;
    super.mount(parent);
  }

  override open(): void {
    if (openReactMovablePanel(this, 'dialogue')) return;
    super.open();
  }

  override focus(): void {
    if (focusReactMovablePanel(this, 'dialogue')) return;
    super.focus();
  }

  override getRootElement(): HTMLElement | null {
    if (isReactMovablePanelEnabled()) return null;
    return super.getRootElement();
  }

  protected override onOpen(): void {
    hideInteractionCard();
  }

  protected override afterRender(): void {
    this.applyLayoutMode();
    if (!this.isAnciaoCael()) return;
    this.healGateway.attach(this.query<HTMLButtonElement>('[data-action="heal"]'));
    this.rationGateway.attach(
      this.query<HTMLButtonElement>('[data-action="cael-ration-buy"]'),
    );
  }

  protected override onClose(): void {
    this.healGateway.detach();
    this.rationGateway.detach();
    this.chroniclesLoading = false;
    this.chroniclesError = null;
    this.chroniclesSnapshot = null;
    if (!this.preserveWorldHudSession && !this.suppressWorldHudRelease) {
      this.releaseWorldHudInteraction();
    }
    this.preserveWorldHudSession = false;
    this.suppressWorldHudRelease = false;
  }

  /** Fecha sem liberar sessão de mundo — usado por closeAllNpcModals(). */
  dismissWithoutWorldSession(): void {
    if (!this.isOpen()) return;
    this.preserveWorldHudSession = false;
    this.suppressWorldHudRelease = true;
    super.close();
  }

  /** Encerra terminal do Cael — limpa sessão de mundo via closeAllNpcModals. */
  private dismissCaelTerminal(): void {
    closeAllNpcModals(this);
  }

  override close(): void {
    if (closeReactMovablePanel(this, 'dialogue')) return;
    if (!this.isOpen()) return;
    if (this.isAnciaoCael() && !this.suppressWorldHudRelease) {
      this.dismissCaelTerminal();
      return;
    }
    super.close();
  }

  private requestClose(): void {
    if (this.isAnciaoCael()) {
      this.dismissCaelTerminal();
      return;
    }
    this.close();
  }

  private releaseWorldHudInteraction(): void {
    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }
  }

  showDialogue(payload: DialogueState): void {
    if (tryOpenReactWorldPanel('dialogue', {
      kind: 'dialogue',
      npcId: payload.npcId,
      npcName: payload.npcName,
      text: payload.text,
    })) {
      return;
    }

    this.state = { ...payload };
    this.chroniclesLoading = false;
    this.chroniclesError = null;
    this.chroniclesSnapshot = null;

    this.applyLayoutMode();
    this.render();

    if (this.isAnciaoCael()) {
      void this.loadChronicles();
    }

    this.open();
  }

  private applyLayoutMode(): void {
    if (!this.root) return;
    const cael = this.isAnciaoCael();
    this.root.classList.toggle('ui-panel--dialogue-cael', cael);
    this.root.classList.toggle('ui-panel--dialogue-generic', !cael);
  }

  private isAnciaoCael(): boolean {
    return this.state.npcId === NPC_HEAL_PROVIDER_ANCIAO_CAEL;
  }

  createTemplate(): string {
    if (this.isAnciaoCael()) {
      return this.renderCaelTemplate();
    }
    if (this.isRefractionInstructor()) {
      return this.renderRefractionInstructorTemplate();
    }
    return this.renderGenericTemplate();
  }

  private isRefractionInstructor(): boolean {
    return this.state.npcId === REFRACTION_BOOTH_INSTRUCTOR_NPC;
  }

  private renderRefractionInstructorTemplate(): string {
    const entryCost = REFRACTION_BOOTH_CONFIG.entryCostVolts;

    return `
      <header class="ui-panel__header" data-panel-drag-handle>
        <h2 class="ui-panel__title">${escapeHtml(this.state.npcName || 'Instrutor Kael')}</h2>
        <button type="button" class="ui-panel__close" data-action="close" data-panel-no-drag aria-label="Fechar diálogo">×</button>
      </header>
      <div class="ui-panel__body ui-dialogue-body">
        <p class="ui-dialogue-text">${escapeHtml(this.state.text)}</p>
        <p class="ui-dialogue-heal-hint">Entrada: ${formatVolts(entryCost)} — desafio de ~45s.</p>
        <div class="ui-dialogue-choices">
          <button type="button" class="ui-dialogue-heal-btn ui-dialogue-choice--accept" data-action="refraction-accept">
            Sim, participar
          </button>
          <button type="button" class="ui-dialogue-heal-btn ui-dialogue-choice--decline" data-action="close">
            Não, obrigado
          </button>
        </div>
      </div>
    `;
  }

  private renderGenericTemplate(): string {
    return `
      <header class="ui-panel__header" data-panel-drag-handle>
        <h2 class="ui-panel__title">${escapeHtml(this.state.npcName || 'NPC')}</h2>
        <button type="button" class="ui-panel__close" data-action="close" data-panel-no-drag aria-label="Fechar diálogo">×</button>
      </header>
      <div class="ui-panel__body ui-dialogue-body">
        <p class="ui-dialogue-text">${escapeHtml(this.state.text)}</p>
      </div>
    `;
  }

  private renderCaelTemplate(): string {
    const level = getPlayerEquipmentStore().getSnapshot().level;
    const voltsCost = resolveHealVoltsCost(level);
    const healSub =
      voltsCost > 0 ? formatVolts(HEAL_VOLT_COST) : 'Grátis (novatos)';
    const rationQuote = resolveCaelPetRationQuote();

    return `
      <header class="cael-panel__header ui-panel__header" data-panel-drag-handle>
        <div class="cael-panel__header-main">
          <span class="cael-panel__tag">TERMINAL // ANCIÃO CAEL</span>
          <h2 class="ui-panel__title cael-panel__title">${escapeHtml(this.state.npcName || 'Ancião Cael')}</h2>
          <p class="cael-panel__greeting">${escapeHtml(this.state.text)}</p>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" data-panel-no-drag aria-label="Fechar terminal">×</button>
      </header>
      <div class="ui-panel__body cael-panel__body">
        <aside class="cael-panel__tools" aria-label="Ferramentas de suporte">
          <h3 class="cael-panel__section-label">Ferramentas de Suporte</h3>
          <div class="cael-panel__actions">
            <button
              type="button"
              class="cael-panel__action cael-panel__action--heal"
              data-action="heal"
              ${this.healGateway.busyAttrs()}
            >
              <span class="cael-panel__action-icon" aria-hidden="true">+</span>
              <span class="cael-panel__action-text">
                <strong>Recuperar Vida</strong>
                <small>${healSub}</small>
              </span>
            </button>
            <button
              type="button"
              class="cael-panel__action cael-panel__action--pet"
              data-action="cael-ration-buy"
              ${this.rationGateway.busyAttrs()}
            >
              <span class="cael-panel__action-icon" aria-hidden="true">🍖</span>
              <span class="cael-panel__action-text">
                <strong>Comprar Ração Especial</strong>
                <small>${formatVolts(rationQuote.priceVolts)} · ${rationQuote.chargesPerStack} cargas na HUD Pet Love</small>
              </span>
            </button>
            <button type="button" class="cael-panel__action" data-action="survival-guide">
              <span class="cael-panel__action-icon" aria-hidden="true">?</span>
              <span class="cael-panel__action-text">
                <strong>Guia de Sobrevivência</strong>
                <small>Dicas práticas para expedições</small>
              </span>
            </button>
          </div>
          <p class="cael-panel__tools-hint">
            Companheiros vivem 15 meses (25 anos). Compre ração aqui e alimente na HUD Pet Love.
            ${level <= HEAL_FREE_MAX_LEVEL
              ? 'Novatos até nível 5 curam gratuitamente.'
              : 'Serviço de cura — desconto automático em VOLTS.'}
          </p>
        </aside>
        <section class="cael-panel__chronicles" aria-label="Crônicas de Altercadia">
          <h3 class="cael-panel__section-label">Crônicas de Altercadia</h3>
          <div class="cael-panel__scroll">
            ${this.renderChroniclesBody()}
          </div>
        </section>
      </div>
    `;
  }

  private renderChroniclesBody(): string {
    if (this.chroniclesLoading) {
      return '<p class="cael-panel__chronicles-status">Cael consulta os pergaminhos…</p>';
    }

    if (this.chroniclesError) {
      return `<p class="cael-panel__chronicles-status cael-panel__chronicles-status--error">${escapeHtml(this.chroniclesError)}</p>`;
    }

    if (!this.chroniclesSnapshot || this.chroniclesSnapshot.lines.length === 0) {
      return '<p class="cael-panel__chronicles-status">Nenhum rumor novo chegou aos ouvidos do Ancião.</p>';
    }

    const intro = this.chroniclesSnapshot.absenceIntro
      ? `<p class="cael-panel__chronicles-intro">${escapeHtml(this.chroniclesSnapshot.absenceIntro)}</p>`
      : '';

    const items = this.chroniclesSnapshot.lines
      .map(
        (line) => `
          <article
            class="cael-panel__chronicle${line.missedWhileAway ? ' cael-panel__chronicle--missed' : ''}"
            data-hud-fit-item
            data-hud-priority="${resolveChroniclePriority(line)}"
          >
            <p class="cael-panel__chronicle-text">${escapeHtml(line.narrative)}</p>
          </article>
        `,
      )
      .join('');

    return `${intro}<div class="cael-panel__chronicles-feed">${items}</div>`;
  }

  private async loadChronicles(): Promise<void> {
    if (this.chroniclesSnapshot || this.chroniclesLoading) return;

    this.chroniclesLoading = true;
    this.chroniclesError = null;
    this.renderChroniclesRegion();

    const creds = resolveWorldLoreCredentials();
    const prioritizeAbsence = consumeChroniclesAbsencePriority();

    try {
      this.chroniclesSnapshot = await fetchWorldChronicles({
        playerId: creds.playerId,
        characterId: creds.characterId,
        prioritizeAbsence,
      });
      this.chroniclesError = null;
    } catch {
      this.chroniclesError = 'Os pergaminhos estão embaralhados… tente de novo em instantes.';
      this.chroniclesSnapshot = null;
    } finally {
      this.chroniclesLoading = false;
      this.renderChroniclesRegion();
    }
  }

  private renderChroniclesRegion(): void {
    const scroll = this.query<HTMLElement>('.cael-panel__scroll');
    if (scroll) scroll.innerHTML = this.renderChroniclesBody();
  }

  private readonly onPanelClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('[data-action="close"]')) {
      event.preventDefault();
      event.stopPropagation();
      this.requestClose();
      return;
    }

    this.handlePanelAction(event);
  };

  protected override bindEvents(): void {
    this.root?.addEventListener('click', this.onPanelClick);
  }

  private handlePanelAction(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const actionEl = target.closest<HTMLElement>('[data-action]');
    const action = actionEl?.dataset.action;
    if (!action || !actionEl) return;

    if (action === 'close') {
      this.requestClose();
      return;
    }

    if (this.isAnciaoCael()) {
      console.log('[Cael] Botão clicado!', action);
    }

    event.preventDefault();
    event.stopPropagation();

    if (action === 'refraction-accept') {
      this.preserveWorldHudSession = true;
      this.close();
      uiEvents.emit(UIEventType.REFRACTION_CHALLENGE_ACCEPT, {});
      return;
    }

    if (action === 'survival-guide') {
      openSurvivalGuideCard();
      return;
    }

    if (action === 'heal' || action === 'cael-ration-buy') {
      return;
    }

  }

  private buildHealGatewayOptions(): ActionGatewayButtonOptions {
    const level = getPlayerEquipmentStore().getSnapshot().level;
    const voltsCost = resolveHealVoltsCost(level);
    const healSub = voltsCost > 0 ? formatVolts(HEAL_VOLT_COST) : 'Grátis (novatos)';

    return {
      renderContent: (button, pending) => {
        button.innerHTML = pending
          ? `<span class="cael-panel__action-icon" aria-hidden="true">+</span>
             <span class="cael-panel__action-text">
               <strong>Curando…</strong>
               <small>Aguardando servidor…</small>
             </span>`
          : `<span class="cael-panel__action-icon" aria-hidden="true">+</span>
             <span class="cael-panel__action-text">
               <strong>Recuperar Vida</strong>
               <small>${healSub}</small>
             </span>`;
      },
      onClick: () => {
        const result = getActionDispatcher().dispatch({
          type: 'HEAL_AT_NPC',
          payload: {
            npcId: this.state.npcId,
          },
        });
        if (!result.ok) {
          alertSystem(result.reason);
          return;
        }
        if (result.status === 'applied') this.render();
        return result;
      },
    };
  }

  private buildRationGatewayOptions(): ActionGatewayButtonOptions {
    const rationQuote = resolveCaelPetRationQuote();

    return {
      renderContent: (button, pending) => {
        button.innerHTML = pending
          ? `<span class="cael-panel__action-icon" aria-hidden="true">🍖</span>
             <span class="cael-panel__action-text">
               <strong>Comprando…</strong>
               <small>Aguardando servidor…</small>
             </span>`
          : `<span class="cael-panel__action-icon" aria-hidden="true">🍖</span>
             <span class="cael-panel__action-text">
               <strong>Comprar Ração Especial</strong>
               <small>${formatVolts(rationQuote.priceVolts)} · ${rationQuote.chargesPerStack} cargas na HUD Pet Love</small>
             </span>`;
      },
      onClick: () => {
        const result = getActionDispatcher().dispatch({
          type: 'CAEL_BUY_PET_RATION',
          payload: { npcId: this.state.npcId },
        });
        if (!result.ok) {
          alertSystem(result.reason);
          return;
        }
        if (result.status === 'applied') {
          const total = getPlayerPetStore().getRationCharges();
          alertSystem(
            `Ração Especial adquirida. ${total} carga${total === 1 ? '' : 's'} na HUD Pet Love.`,
          );
          this.render();
        }
        return result;
      },
    };
  }
}
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveChroniclePriority(line: {
  readonly missedWhileAway?: boolean;
  readonly importance: 'minor' | 'notable' | 'major';
}): number {
  if (line.missedWhileAway) return 1;
  if (line.importance === 'major') return 2;
  if (line.importance === 'notable') return 3;
  return 4;
}


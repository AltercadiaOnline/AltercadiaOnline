import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';
import {
  ARENA_TOURNAMENT_MIN_BET_VOLTS,
  describeArenaTournamentRules,
  resolveArenaTournamentBetPresets,
  validateArenaTournamentBet,
} from '../../../shared/arena/arenaTournamentBetService.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { alertSystem } from '../alertSystem.js';
import { BaseUIComponent } from '../UIComponent.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import {
  closeReactMovablePanel,
  focusReactMovablePanel,
  isReactMovablePanelEnabled,
  openReactMovablePanel,
} from '../../app/panels/reactMovablePanelBridge.js';
import { tryOpenReactWorldPanel } from '../../app/panels/initWorldPanelsBridge.js';

export type TournamentBetContext = {
  readonly pulpitId: string;
  readonly pulpitName: string;
};

/** HUD de aceite de torneio/aposta — aberta nos púlpitos da arena. */
export class TournamentBetPanel extends BaseUIComponent {
  private readonly dataStore = getDataStore();

  private context: TournamentBetContext = {
    pulpitId: 'arena_pulpit_center',
    pulpitName: 'Púlpito Central',
  };
  private wallet: WalletSnapshot = this.dataStore.getWallet();
  private betVolts = ARENA_TOURNAMENT_MIN_BET_VOLTS;
  private awaitingMatch = false;

  private unsubWallet: (() => void) | null = null;

  constructor() {
    super({
      id: 'tournamentBet',
      rootClassName: 'ui-panel ui-panel--tournament-bet ui-panel--movable',
    });
  }

  override mount(parent: HTMLElement): void {
    if (isReactMovablePanelEnabled()) return;
    super.mount(parent);
  }

  override open(): void {
    if (openReactMovablePanel(this, 'tournamentBet')) return;
    super.open();
  }

  override close(): void {
    if (closeReactMovablePanel(this, 'tournamentBet')) return;
    super.close();
  }

  override focus(): void {
    if (focusReactMovablePanel(this, 'tournamentBet')) return;
    super.focus();
  }

  override getRootElement(): HTMLElement | null {
    if (isReactMovablePanelEnabled()) return null;
    return super.getRootElement();
  }

  openForPulpit(context: TournamentBetContext): void {
    if (tryOpenReactWorldPanel('tournamentBet', {
      kind: 'tournamentBet',
      pulpitId: context.pulpitId,
      pulpitName: context.pulpitName,
    })) {
      return;
    }

    this.context = { ...context };
    this.awaitingMatch = false;
    this.wallet = this.dataStore.getWallet();
    this.betVolts = Math.min(
      ARENA_TOURNAMENT_MIN_BET_VOLTS,
      Math.max(ARENA_TOURNAMENT_MIN_BET_VOLTS, this.wallet.dollarVolt),
    );
    this.render();
    this.open();
  }

  protected override onOpen(): void {
    this.wallet = this.dataStore.getWallet();
    this.unsubWallet = this.dataStore.subscribe('wallet', (wallet) => {
      this.wallet = wallet;
      if (this.isOpen()) this.updateWalletLabel();
    });
  }

  protected override onClose(): void {
    this.unsubWallet?.();
    this.unsubWallet = null;
    this.awaitingMatch = false;

    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }
  }

  createTemplate(): string {
    const presets = resolveArenaTournamentBetPresets(this.wallet.dollarVolt);
    const maxBet = Math.min(this.wallet.dollarVolt, 10_000);
    const rules = describeArenaTournamentRules();

    return `
      <header class="ui-panel__header tournament-bet__header" data-panel-drag-handle>
        <div class="tournament-bet__header-main">
          <span class="tournament-bet__tag">ARENA // TORNEIO</span>
          <h2 class="ui-panel__title tournament-bet__title">${this.context.pulpitName}</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar torneio">×</button>
      </header>
      <div class="ui-panel__body tournament-bet__body">
        <p class="tournament-bet__balance">
          Saldo: <strong data-tournament-wallet>${this.wallet.voltsFormatted}</strong>
        </p>
        <p class="tournament-bet__hint">
          Você está no palco — outros jogadores veem que você está configurando uma aposta.
        </p>

        <section class="tournament-bet__rules" aria-label="Regras">
          <h3 class="tournament-bet__section-title">Regras</h3>
          <ul class="tournament-bet__rules-list">
            ${rules.map((line) => `<li>${line}</li>`).join('')}
          </ul>
        </section>

        <section class="tournament-bet__form" aria-label="Configurar aposta">
          <h3 class="tournament-bet__section-title">Valor da aposta</h3>
          <div class="tournament-bet__presets">
            ${presets.map((preset) => `
              <button
                type="button"
                class="tournament-bet__preset${this.betVolts === preset ? ' is-active' : ''}"
                data-bet-preset="${preset}"
              >${formatVoltsShort(preset)}</button>
            `).join('')}
          </div>
          <label class="tournament-bet__input-wrap">
            <span>Aposta (Volts)</span>
            <input
              type="number"
              min="${ARENA_TOURNAMENT_MIN_BET_VOLTS}"
              max="${maxBet}"
              step="10"
              class="tournament-bet__input"
              data-bet-input
              value="${this.betVolts}"
            />
          </label>
        </section>

        <div class="tournament-bet__actions">
          <button type="button" class="tournament-bet__confirm" data-action="confirm-bet">
            Confirmar interesse no torneio
          </button>
          ${this.awaitingMatch
            ? '<p class="tournament-bet__status">Aguardando pareamento…</p>'
            : ''}
        </div>
      </div>
    `;
  }

  private updateWalletLabel(): void {
    const el = this.query<HTMLElement>('[data-tournament-wallet]');
    if (el) el.textContent = this.wallet.voltsFormatted;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        this.close();
        return;
      }

      const presetBtn = target.closest<HTMLElement>('[data-bet-preset]');
      if (presetBtn) {
        this.betVolts = Math.max(1, Number(presetBtn.dataset.betPreset) || ARENA_TOURNAMENT_MIN_BET_VOLTS);
        this.render();
        return;
      }

      if (target.dataset.action === 'confirm-bet') {
        this.confirmBet();
      }
    });

    this.root?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches('[data-bet-input]')) return;
      this.betVolts = Math.max(0, Math.floor(Number(target.value) || 0));
    });
  }

  private confirmBet(): void {
    const validation = validateArenaTournamentBet({
      betVolts: this.betVolts,
      walletVolts: this.wallet.dollarVolt,
    });

    if (!validation.ok) {
      alertSystem(validation.reason);
      return;
    }

    this.betVolts = validation.betVolts;
    this.awaitingMatch = true;
    alertSystem(
      `Aposta de ${formatVoltsShort(validation.betVolts)} registrada. Aguardando adversários no torneio.`,
    );
    this.render();
  }
}

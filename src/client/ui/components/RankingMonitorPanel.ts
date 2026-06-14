import {
  getTournamentRankingBoard,
} from '../../../shared/arena/tournamentRankingStore.js';
import {
  TournamentRankingPeriod,
  type TournamentRankingBoard,
} from '../../../shared/arena/tournamentRankingTypes.js';
import { getPlayerProfileStore } from '../character/playerProfileStore.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { BaseUIComponent } from '../UIComponent.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

export type RankingMonitorContext = {
  readonly objectId: string;
  readonly label: string;
};

const TAB_DEFS: ReadonlyArray<{ readonly id: TournamentRankingPeriod; readonly label: string }> = [
  { id: TournamentRankingPeriod.DAILY, label: 'Diário' },
  { id: TournamentRankingPeriod.WEEKLY, label: 'Semanal' },
  { id: TournamentRankingPeriod.ALL_TIME, label: 'Geral' },
];

/** HUD do monitor de ranking da arena — abas Diário / Semanal / Geral. */
export class RankingMonitorPanel extends BaseUIComponent {
  private context: RankingMonitorContext = {
    objectId: 'arena_ranking_monitor',
    label: 'Monitor de Ranking',
  };
  private period: TournamentRankingPeriod = TournamentRankingPeriod.DAILY;
  private displayName = getPlayerProfileStore().getSnapshot().displayName;
  private unsubProfile: (() => void) | null = null;

  constructor() {
    super({
      id: 'rankingMonitor',
      rootClassName: 'ui-panel ui-panel--ranking-monitor ui-panel--movable',
    });
  }

  openForMonitor(context: RankingMonitorContext): void {
    this.context = { ...context };
    this.period = TournamentRankingPeriod.DAILY;
    this.displayName = getPlayerProfileStore().getSnapshot().displayName;
    this.render();
    this.open();
  }

  protected override onOpen(): void {
    this.displayName = getPlayerProfileStore().getSnapshot().displayName;
    this.unsubProfile = getPlayerProfileStore().subscribe((profile) => {
      this.displayName = profile.displayName;
      if (this.isOpen()) this.renderTableBody();
    });
  }

  protected override onClose(): void {
    this.unsubProfile?.();
    this.unsubProfile = null;

    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }
  }

  protected override shouldUseDynamicLayout(): boolean {
    return true;
  }

  protected override getDynamicLayoutOptions() {
    return {
      fitRootSelector: '[data-hud-fit-root]',
      itemSelector: '[data-hud-fit-item]',
      secondarySelector: '[data-hud-fit-secondary]',
      minVisibleItems: 3,
    };
  }

  createTemplate(): string {
    const board = this.loadBoard();

    return `
      <header class="ui-panel__header ranking-monitor__header" data-panel-drag-handle>
        <div class="ranking-monitor__header-main">
          <span class="ranking-monitor__tag">ARENA // RANKING</span>
          <h2 class="ui-panel__title ranking-monitor__title">${this.context.label}</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar ranking">×</button>
      </header>
      <div class="ui-panel__body ranking-monitor__body" data-hud-fit-root>
        <nav class="ranking-monitor__tabs" aria-label="Período do ranking" data-hud-fit-secondary>
          ${TAB_DEFS.map((tab) => `
            <button
              type="button"
              class="ranking-monitor__tab${this.period === tab.id ? ' is-active' : ''}"
              data-ranking-tab="${tab.id}"
              aria-pressed="${this.period === tab.id ? 'true' : 'false'}"
            >${tab.label}</button>
          `).join('')}
        </nav>

        <div class="ranking-monitor__board" aria-live="polite">
          <div class="ranking-monitor__table-head">
            <span>#</span>
            <span>Jogador</span>
            <span>Vitórias</span>
          </div>
          <div class="ranking-monitor__rows" data-ranking-rows>
            ${this.renderRows(board)}
          </div>
        </div>

        <p class="ranking-monitor__footnote" data-hud-fit-secondary>
          ${board.title} — vitórias no torneio da arena
        </p>
      </div>
    `;
  }

  private loadBoard(): TournamentRankingBoard {
    return getTournamentRankingBoard(this.period, this.displayName);
  }

  private renderRows(board: TournamentRankingBoard): string {
    return board.entries
      .map((entry) => {
        const isSelf = entry.playerId === 'p_local';
        return `
          <div
            class="ranking-monitor__row${isSelf ? ' is-self' : ''}"
            data-hud-fit-item
            data-hud-priority="${entry.rank}"
          >
            <span class="ranking-monitor__rank">${entry.rank}</span>
            <span class="ranking-monitor__name">${entry.displayName}</span>
            <span class="ranking-monitor__wins">${entry.wins.toLocaleString('pt-BR')}</span>
          </div>
        `;
      })
      .join('');
  }

  private renderTableBody(): void {
    const host = this.query<HTMLElement>('[data-ranking-rows]');
    if (!host) return;
    host.innerHTML = this.renderRows(this.loadBoard());
    this.scheduleDynamicLayout();
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        this.close();
        return;
      }

      const tabBtn = target.closest<HTMLElement>('[data-ranking-tab]');
      if (!tabBtn?.dataset.rankingTab) return;

      const nextPeriod = tabBtn.dataset.rankingTab as TournamentRankingPeriod;
      if (nextPeriod === this.period) return;

      this.period = nextPeriod;
      this.render();
    });
  }
}

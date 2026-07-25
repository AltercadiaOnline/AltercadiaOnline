// @ts-nocheck
import { getTournamentRankingBoard, } from '../../../shared/arena/tournamentRankingStore.js';
import { TournamentRankingPeriod, } from '../../../shared/arena/tournamentRankingTypes.js';
const TAB_DEFS = [
    { id: TournamentRankingPeriod.DAILY, label: 'Diário' },
    { id: TournamentRankingPeriod.WEEKLY, label: 'Semanal' },
    { id: TournamentRankingPeriod.ALL_TIME, label: 'Geral' },
];
function renderRows(board) {
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
export function buildRankingMonitorBodyHtml(model) {
    const board = getTournamentRankingBoard(model.period, model.displayName);
    return `
    <nav class="ranking-monitor__tabs" aria-label="Período do ranking" data-hud-fit-secondary>
      ${TAB_DEFS.map((tab) => `
        <button
          type="button"
          class="ranking-monitor__tab${model.period === tab.id ? ' is-active' : ''}"
          data-ranking-tab="${tab.id}"
          aria-pressed="${model.period === tab.id ? 'true' : 'false'}"
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
        ${renderRows(board)}
      </div>
    </div>

    <p class="ranking-monitor__footnote" data-hud-fit-secondary>
      ${board.title} — vitórias no torneio da arena
    </p>
  `;
}

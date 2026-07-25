// @ts-nocheck
import { ARENA_TOURNAMENT_MIN_BET_VOLTS, describeArenaTournamentRules, resolveArenaTournamentBetPresets, } from '../../../shared/arena/arenaTournamentBetService.js';
import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';
export function buildTournamentBetBodyHtml(model) {
    const presets = resolveArenaTournamentBetPresets(model.wallet.dollarVolt);
    const maxBet = Math.min(model.wallet.dollarVolt, 10_000);
    const rules = describeArenaTournamentRules();
    return `
    <p class="tournament-bet__balance">
      Saldo: <strong data-tournament-wallet>${model.wallet.voltsFormatted}</strong>
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
            class="tournament-bet__preset${model.betVolts === preset ? ' is-active' : ''}"
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
          value="${model.betVolts}"
        />
      </label>
    </section>

    <div class="tournament-bet__actions">
      <button type="button" class="tournament-bet__confirm" data-action="confirm-bet">
        Confirmar interesse no torneio
      </button>
      ${model.awaitingMatch
        ? '<p class="tournament-bet__status">Aguardando pareamento…</p>'
        : ''}
    </div>
  `;
}

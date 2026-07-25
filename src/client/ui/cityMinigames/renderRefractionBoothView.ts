// @ts-nocheck
import { REFRACTION_BOOTH_CONFIG } from '../../../shared/cityMinigames/refractionBoothConfig.js';
import { calculateRefractionBoothScore } from '../../../shared/cityMinigames/refractionBoothScore.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
function formatDuration(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}
function renderLeaderboardBlock(leaderboard) {
    if (leaderboard.length === 0) {
        return '<p class="refraction-booth__footnote" data-hud-fit-secondary>Placar vazio — seja o primeiro.</p>';
    }
    const rows = leaderboard
        .map((entry, index) => `
      <div class="refraction-booth__row" data-hud-fit-item data-hud-priority="${index + 1}">
        <span class="refraction-booth__rank">${index + 1}</span>
        <span class="refraction-booth__name">${entry.displayName}</span>
        <span class="refraction-booth__score">${entry.score}</span>
      </div>
    `)
        .join('');
    return `
    <section class="refraction-booth__board" aria-label="Top 10 do estande">
      <div class="refraction-booth__table-head" data-hud-fit-secondary>
        <span>#</span><span>Operative</span><span>Score</span>
      </div>
      <div class="refraction-booth__rows">${rows}</div>
    </section>
  `;
}
function renderStartingBody(model) {
    return `
    <p class="refraction-booth__intro" data-hud-fit-secondary>
      Debitando ${formatVolts(REFRACTION_BOOTH_CONFIG.entryCostVolts)} e preparando o simulador…
    </p>
  `;
}
function renderIdleBody(model) {
    const entryCost = model.quote?.entryCostVolts ?? REFRACTION_BOOTH_CONFIG.entryCostVolts;
    const cooldownMs = model.quote?.cooldownRemainingMs ?? 0;
    const canAfford = model.quote?.canAfford ?? true;
    const dailyRemaining = model.quote?.dailyPrizeRemainingVolts ?? REFRACTION_BOOTH_CONFIG.maxDailyPrizeVolts;
    const cooldownLabel = cooldownMs > 0 ? formatDuration(cooldownMs) : 'Pronto';
    const startDisabled = model.quoteLoading || cooldownMs > 0 || !canAfford || model.completing ? ' disabled' : '';
    return `
    <p class="refraction-booth__intro" data-hud-fit-secondary>
      Patos cruzam o simulador em curvas — acerte o máximo antes do tempo ou de 15 escapadas.
    </p>
    <dl class="refraction-booth__stats" data-hud-fit-item>
      <div><dt>Entrada</dt><dd>${formatVolts(entryCost)}</dd></div>
      <div><dt>Cooldown</dt><dd>${cooldownLabel}</dd></div>
      <div><dt>Prêmio hoje</dt><dd>${formatVolts(dailyRemaining)} restantes</dd></div>
    </dl>
    <button type="button" class="refraction-booth__start"${startDisabled} data-action="start">
      ${model.quoteLoading ? 'Consultando…' : 'Iniciar simulador'}
    </button>
    ${renderLeaderboardBlock(model.leaderboard)}
  `;
}
function renderPlayingBody(model) {
    const missLimit = REFRACTION_BOOTH_CONFIG.maxMisses;
    const missClass = model.misses >= missLimit - 3 ? ' refraction-booth__hud-misses--danger' : '';
    return `
    <div class="refraction-booth__hud" data-hud-fit-secondary>
      <span>Hits: ${model.hits}</span>
      <span class="refraction-booth__hud-misses${missClass}">Caídos: ${model.misses}/${missLimit}</span>
      <span>Score: ${calculateRefractionBoothScore(model.hits, model.misses)}</span>
    </div>
    <div class="refraction-booth__arena" data-refraction-arena></div>
    <p class="refraction-booth__hint" data-hud-fit-secondary>Patos cruzam a tela — clique para derrubar.</p>
  `;
}
function renderResultBody(model) {
    const result = model.lastResult;
    const failNote = model.failedEarly
        ? '<p class="refraction-booth__footnote refraction-booth__footnote--fail" data-hud-fit-secondary>Limite de quedas atingido — simulador encerrado.</p>'
        : '';
    return `
    ${failNote}
    <dl class="refraction-booth__stats refraction-booth__stats--result" data-hud-fit-item>
      <div><dt>Hits</dt><dd>${result.hits}</dd></div>
      <div><dt>Caídos</dt><dd>${result.misses}</dd></div>
      <div><dt>Prêmio</dt><dd>${formatVolts(result.prizeVolts)}</dd></div>
      <div><dt>Prêmio hoje</dt><dd>${formatVolts(result.dailyPrizeTotalVolts)} / ${formatVolts(REFRACTION_BOOTH_CONFIG.maxDailyPrizeVolts)}</dd></div>
    </dl>
    <button type="button" class="refraction-booth__start" data-action="back">Voltar</button>
    ${renderLeaderboardBlock(model.leaderboard)}
  `;
}
export function buildRefractionBoothHeaderHtml(model) {
    if (model.phase === 'playing') {
        return {
            tag: model.failedEarly ? 'LIMITE DE QUEDAS' : 'SIMULADOR ATIVO',
            title: formatDuration(model.remainingMs),
            showClose: false,
        };
    }
    if (model.phase === 'result' && model.lastResult) {
        return {
            tag: 'SESSÃO ENCERRADA',
            title: `Score ${model.lastResult.score}`,
            showClose: true,
        };
    }
    return {
        tag: 'CIDADE 01 // REFRAÇÃO',
        title: model.context.label,
        showClose: true,
    };
}
export function buildRefractionBoothBodyHtml(model) {
    if (model.phase === 'starting' || model.startPending) {
        return renderStartingBody(model);
    }
    if (model.phase === 'playing') {
        return renderPlayingBody(model);
    }
    if (model.phase === 'result' && model.lastResult) {
        return renderResultBody(model);
    }
    return renderIdleBody(model);
}
export function buildRefractionBoothBodyClassName(model) {
    return model.phase === 'playing'
        ? 'refraction-booth__body refraction-booth__body--playing'
        : 'refraction-booth__body';
}

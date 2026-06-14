import type { BattleReportSnapshot } from '../../../shared/combat/battleReportTypes.js';

export type BattleStatisticsData = BattleReportSnapshot;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatNumber(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('pt-BR');
}

function buildDamageCompareHtml(report: BattleReportSnapshot): string {
  const dealt = report.totalDanoCausado;
  const received = report.totalDanoRecebido;
  const peak = Math.max(dealt, received, 1);
  const dealtPct = Math.round((dealt / peak) * 100);
  const receivedPct = Math.round((received / peak) * 100);

  return `
    <section class="battle-stats-report__section" aria-label="Comparativo de dano">
      <h4 class="battle-stats-report__heading">Comparativo de dano</h4>
      <div class="battle-stats-report__metric">
        <div class="battle-stats-report__metric-label">
          <span>Causado</span>
          <strong>${formatNumber(dealt)}</strong>
        </div>
        <div class="battle-stats-report__bar-track" role="presentation">
          <div class="battle-stats-report__bar battle-stats-report__bar--dealt" style="width:${dealtPct}%"></div>
        </div>
      </div>
      <div class="battle-stats-report__metric">
        <div class="battle-stats-report__metric-label">
          <span>Recebido</span>
          <strong>${formatNumber(received)}</strong>
        </div>
        <div class="battle-stats-report__bar-track" role="presentation">
          <div class="battle-stats-report__bar battle-stats-report__bar--received" style="width:${receivedPct}%"></div>
        </div>
      </div>
    </section>
  `;
}

function buildMovesHtml(report: BattleReportSnapshot): string {
  if (report.movesUsados.length === 0) {
    return `
      <section class="battle-stats-report__section">
        <h4 class="battle-stats-report__heading">Habilidades utilizadas</h4>
        <p class="battle-stats-report__empty">Nenhum movimento registrado nesta batalha.</p>
      </section>
    `;
  }

  const maxUso = Math.max(...report.movesUsados.map((entry) => entry.uso), 1);
  const rows = report.movesUsados.map((entry) => {
    const pct = Math.round((entry.uso / maxUso) * 100);
    return `
      <div class="battle-stats-report__move">
        <div class="battle-stats-report__metric-label">
          <span>${escapeHtml(entry.nome)}</span>
          <strong>${entry.uso}×</strong>
        </div>
        <div class="battle-stats-report__bar-track" role="presentation">
          <div class="battle-stats-report__bar battle-stats-report__bar--move" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="battle-stats-report__section" aria-label="Habilidades mais utilizadas">
      <h4 class="battle-stats-report__heading">Habilidades utilizadas</h4>
      ${rows}
    </section>
  `;
}

let activeCloseHandler: (() => void) | null = null;

/** Renderiza o relatório de batalha — reutiliza snapshot persistido na observação. */
export function showBattleStatisticsPanel(
  data: BattleStatisticsData,
  mountRoot?: ParentNode,
): () => void {
  activeCloseHandler?.();

  const mountTarget = mountRoot instanceof HTMLElement
    ? mountRoot
    : document.querySelector<HTMLElement>('.post-battle-hub')
    ?? document.querySelector<HTMLElement>('#scene-combat')
    ?? document.body;

  const doc = mountTarget.ownerDocument ?? document;
  const overlay = doc.createElement('div');
  overlay.className = 'battle-stats-overlay battle-stats-overlay--terminal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Relatório de batalha');

  const panel = doc.createElement('div');
  panel.className = 'battle-stats-panel battle-stats-panel--terminal';

  panel.innerHTML = `
    <header class="battle-stats-panel__header">
      <p class="battle-stats-panel__eyebrow">Relatório de Batalha</p>
      <h3 class="battle-stats-panel__title">Estatísticas</h3>
      <p class="battle-stats-panel__meta">ID ${escapeHtml(data.battleId)} · ${formatNumber(data.turnos)} turnos</p>
    </header>
    <div class="battle-stats-report">
      ${buildDamageCompareHtml(data)}
      ${buildMovesHtml(data)}
    </div>
    <button type="button" class="battle-stats-panel__close">Fechar relatório</button>
  `;

  const closeBtn = panel.querySelector<HTMLButtonElement>('.battle-stats-panel__close');
  const close = () => {
    overlay.remove();
    if (activeCloseHandler === close) {
      activeCloseHandler = null;
    }
  };

  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  overlay.appendChild(panel);
  mountTarget.appendChild(overlay);
  closeBtn?.focus();
  activeCloseHandler = close;

  return close;
}

export function closeBattleStatisticsPanel(): void {
  activeCloseHandler?.();
}

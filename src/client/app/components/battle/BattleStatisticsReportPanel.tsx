import { useEffect, useRef } from 'react';
import type { BattleReportSnapshot } from '../../../../shared/combat/battleReportTypes.js';
import { getBattleStatsBridge } from '../../bridge/battleStatsBridge.js';

function formatNumber(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('pt-BR');
}

function DamageCompareSection({ report }: { readonly report: BattleReportSnapshot }) {
  const dealt = report.totalDanoCausado;
  const received = report.totalDanoRecebido;
  const peak = Math.max(dealt, received, 1);
  const dealtPct = Math.round((dealt / peak) * 100);
  const receivedPct = Math.round((received / peak) * 100);

  return (
    <section className="battle-stats-report__section" aria-label="Comparativo de dano">
      <h4 className="battle-stats-report__heading">Comparativo de dano</h4>
      <div className="battle-stats-report__metric">
        <div className="battle-stats-report__metric-label">
          <span>Causado</span>
          <strong>{formatNumber(dealt)}</strong>
        </div>
        <div className="battle-stats-report__bar-track" role="presentation">
          <div
            className="battle-stats-report__bar battle-stats-report__bar--dealt"
            style={{ width: `${dealtPct}%` }}
          />
        </div>
      </div>
      <div className="battle-stats-report__metric">
        <div className="battle-stats-report__metric-label">
          <span>Recebido</span>
          <strong>{formatNumber(received)}</strong>
        </div>
        <div className="battle-stats-report__bar-track" role="presentation">
          <div
            className="battle-stats-report__bar battle-stats-report__bar--received"
            style={{ width: `${receivedPct}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function MovesSection({ report }: { readonly report: BattleReportSnapshot }) {
  if (report.movesUsados.length === 0) {
    return (
      <section className="battle-stats-report__section">
        <h4 className="battle-stats-report__heading">Habilidades utilizadas</h4>
        <p className="battle-stats-report__empty">Nenhum movimento registrado nesta batalha.</p>
      </section>
    );
  }

  const maxUso = Math.max(...report.movesUsados.map((entry) => entry.uso), 1);

  return (
    <section className="battle-stats-report__section" aria-label="Habilidades mais utilizadas">
      <h4 className="battle-stats-report__heading">Habilidades utilizadas</h4>
      {report.movesUsados.map((entry) => {
        const pct = Math.round((entry.uso / maxUso) * 100);
        return (
          <div key={entry.nome} className="battle-stats-report__move">
            <div className="battle-stats-report__metric-label">
              <span>{entry.nome}</span>
              <strong>{entry.uso}×</strong>
            </div>
            <div className="battle-stats-report__bar-track" role="presentation">
              <div
                className="battle-stats-report__bar battle-stats-report__bar--move"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}

type BattleStatisticsReportPanelProps = {
  report: BattleReportSnapshot;
};

export function BattleStatisticsReportPanel({ report }: BattleStatisticsReportPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [report.battleId]);

  const close = () => {
    getBattleStatsBridge().dismiss();
  };

  return (
    <div
      className="battle-stats-overlay battle-stats-overlay--terminal pointer-events-auto fixed inset-0 z-[1000003] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Relatório de batalha"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="battle-stats-panel battle-stats-panel--terminal">
        <header className="battle-stats-panel__header">
          <p className="battle-stats-panel__eyebrow">Relatório de Batalha</p>
          <h3 className="battle-stats-panel__title">Estatísticas</h3>
          <p className="battle-stats-panel__meta">
            ID {report.battleId} · {formatNumber(report.turnos)} turnos
          </p>
        </header>
        <div className="battle-stats-report">
          <DamageCompareSection report={report} />
          <MovesSection report={report} />
        </div>
        <button
          ref={closeRef}
          type="button"
          className="battle-stats-panel__close"
          onClick={close}
        >
          Fechar relatório
        </button>
      </div>
    </div>
  );
}

type BattleStatisticsMountProps = {
  active: boolean;
  report: BattleReportSnapshot | null;
};

export function BattleStatisticsMount({ active, report }: BattleStatisticsMountProps) {
  if (!active || !report) return null;
  return <BattleStatisticsReportPanel report={report} />;
}

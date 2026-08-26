import { useMemo } from 'react';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import {
  resolveRankingMonitorFromContext,
  useRankingMonitorPanelState,
} from '../../../panels/useRankingMonitorPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import {
  PVP_RANKED_ACCEPT_COUNTDOWN_MS,
  PVP_RANKED_MODE,
  PVP_RANKED_STATION_LABEL,
} from '../../../../../shared/combat/pvp/pvpRankedQueueConfig.js';
import {
  PVP_RANKED_HOUSE_RAKE_RATE,
  PVP_RANKED_STAKE_MIN_VOLTS,
} from '../../../../../shared/combat/pvp/pvpRankedDuelStake.js';
import { LEADERBOARD_POLL_MS } from '../../../../leaderboard/fetchLeaderboard.js';

type WorldRankingMonitorPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

const HOUSE_RAKE_PERCENT = Math.round(PVP_RANKED_HOUSE_RAKE_RATE * 100);
const COUNTDOWN_SECONDS = Math.round(PVP_RANKED_ACCEPT_COUNTDOWN_MS / 1000);
const POLL_SECONDS = Math.round(LEADERBOARD_POLL_MS / 1000);

/**
 * Computador da Arena (cidade 01) — HUD só de PvP ranqueado.
 * Level / moveset / PvE / PvP casual NÃO entram aqui (vitrine = login).
 * Abre como HUD normal: sem trava de movimento.
 */
export function WorldRankingMonitorPanel({
  context,
  zIndex,
  focused,
}: WorldRankingMonitorPanelProps) {
  const monitor = useMemo(() => resolveRankingMonitorFromContext(context), [context]);
  const state = useRankingMonitorPanelState(monitor);
  const entries = state.snapshot?.entries ?? [];
  const scoreHeader = state.snapshot?.scoreHeader ?? 'Pontos';
  const boardTitle = state.snapshot?.title ?? 'Top PvP Rankeado';

  return (
    <MovablePanelFrame
      windowId="rankingMonitor"
      title={monitor.label}
      titleMeta="// ARENA // PVP RANKED"
      zIndex={zIndex}
      focused={focused}
      bodyOverflow="hidden"
      panelClassName="world-panel--ranking-monitor ui-panel--ranking-monitor ui-panel--npc-hybrid ui-skin-hybrid"
      panelStyle={{
        width: 'min(520px, 96vw)',
        minWidth: 'min(360px, 94vw)',
        height: 'min(560px, 86vh)',
        maxHeight: 'min(620px, 90vh)',
      }}
      onFocus={() => tryFocusReactWorldPanel('rankingMonitor')}
      onClose={() => tryCloseReactWorldPanel('rankingMonitor')}
    >
      <div className="ranking-monitor">
        <div className="ranking-monitor__intro">
          <div className="ranking-monitor__intro-main">
            <span className="ranking-monitor__tag">ARENA // PVP RANQUEADO</span>
            <p className="ranking-monitor__board-live">
              Board: <strong>{boardTitle}</strong>
              <span className="ranking-monitor__board-meta">live · {POLL_SECONDS}s</span>
            </p>
          </div>
          <p className="ranking-monitor__stall-hint">
            Fila no púlpito ({PVP_RANKED_STATION_LABEL} · {PVP_RANKED_MODE}). Este PC só espelha o placar.
          </p>
        </div>

        <section className="ranking-monitor__structure" aria-label="Estrutura do PvP ranqueado">
          <h3 className="ranking-monitor__section-title">Estrutura</h3>
          <ul className="ranking-monitor__structure-list">
            <li>
              Fila 1x1 no púlpito — aposta livre (mín. {PVP_RANKED_STAKE_MIN_VOLTS} V), trava e countdown {COUNTDOWN_SECONDS}s.
            </li>
            <li>
              Placar: +1 vitória / −1 derrota (mín. 0). Pote: vencedor leva a soma menos {HOUSE_RAKE_PERCENT}% da casa.
            </li>
            <li>Board: Top 10 de pontos. Entra na primeira luta; empate → mais vitórias → quem chegou primeiro.</li>
            <li>PvP casual e ranks de nível / moveset / PvE — fora deste terminal (vitrine no login).</li>
          </ul>
        </section>

        <section className="ranking-monitor__board-wrap" aria-label="Ranking de vitórias ranqueadas">
          <h3 className="ranking-monitor__section-title">{boardTitle}</h3>
          <div className="ranking-monitor__board" aria-live="polite">
            <div className="ranking-monitor__table-head">
              <span>#</span>
              <span>Jogador</span>
              <span>{scoreHeader}</span>
            </div>
            <div className="ranking-monitor__rows">
              {entries.map((entry) => (
                <div
                  key={`${entry.rank}-${entry.displayName}`}
                  className="ranking-monitor__row"
                >
                  <span className="ranking-monitor__rank">{entry.rank}</span>
                  <span className="ranking-monitor__name">{entry.displayName}</span>
                  <span className="ranking-monitor__wins">{entry.scoreLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <p className="ranking-monitor__footnote">
          {state.loading && entries.length === 0
            ? 'carregando board ranqueado…'
            : entries.length === 0
              ? 'sem registros ranqueados ainda — primeira luta no púlpito entra no Top'
              : `atualiza a cada ${POLL_SECONDS}s — só PvP ranqueado da cidade`}
        </p>
      </div>
    </MovablePanelFrame>
  );
}

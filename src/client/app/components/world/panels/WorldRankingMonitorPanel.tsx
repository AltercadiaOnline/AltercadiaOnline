import { useMemo } from 'react';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useReleaseWorldHudOnPanelClose } from '../../../panels/useReleaseWorldHudOnPanelClose.js';
import {
  RANKING_TAB_DEFS,
  resolveRankingMonitorFromContext,
  useRankingMonitorPanelState,
} from '../../../panels/useRankingMonitorPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldRankingMonitorPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

export function WorldRankingMonitorPanel({
  context,
  zIndex,
  focused,
}: WorldRankingMonitorPanelProps) {
  const monitor = useMemo(() => resolveRankingMonitorFromContext(context), [context]);
  const state = useRankingMonitorPanelState(monitor);
  const entries = state.snapshot?.entries ?? [];

  useReleaseWorldHudOnPanelClose('rankingMonitor');

  return (
    <MovablePanelFrame
      windowId="rankingMonitor"
      title={monitor.label}
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--ranking-monitor ui-panel--ranking-monitor"
      panelStyle={{ width: 'min(420px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('rankingMonitor')}
      onClose={() => tryCloseReactWorldPanel('rankingMonitor')}
    >
      <div className="ranking-monitor">
        <p className="ranking-monitor__tag">ARENA // RANKING AO VIVO</p>

        <nav className="ranking-monitor__tabs" aria-label="Board de ranking">
          {RANKING_TAB_DEFS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`ranking-monitor__tab${state.boardId === tab.id ? ' is-active' : ''}`}
              aria-pressed={state.boardId === tab.id}
              onClick={() => state.selectBoard(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {state.boardId === 'level_class' ? (
          <nav className="ranking-monitor__tabs" aria-label="Classe">
            {state.classIds.map((id) => (
              <button
                key={id}
                type="button"
                className={`ranking-monitor__tab${state.classId === id ? ' is-active' : ''}`}
                aria-pressed={state.classId === id}
                onClick={() => state.selectClass(id)}
              >
                {id}
              </button>
            ))}
          </nav>
        ) : null}

        <div className="ranking-monitor__board" aria-live="polite">
          <div className="ranking-monitor__table-head">
            <span>#</span>
            <span>Jogador</span>
            <span>{state.snapshot?.scoreHeader ?? 'Score'}</span>
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

        <p className="ranking-monitor__footnote">
          {state.snapshot?.title ?? 'Ranking'}
          {' — '}
          {state.loading && entries.length === 0
            ? 'carregando…'
            : entries.length === 0
              ? 'sem registros nesta board'
              : 'atualiza a cada 4s'}
        </p>
      </div>
    </MovablePanelFrame>
  );
}

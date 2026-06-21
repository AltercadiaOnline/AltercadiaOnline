import { useEffect, useMemo } from 'react';
import { endWorldHudInteractionSession } from '../../../../world/worldHudInteractionSession.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
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

  useEffect(() => () => {
    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }
  }, []);

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
        <p className="ranking-monitor__tag">ARENA // RANKING</p>

        <nav className="ranking-monitor__tabs" aria-label="Período do ranking">
          {RANKING_TAB_DEFS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`ranking-monitor__tab${state.period === tab.id ? ' is-active' : ''}`}
              aria-pressed={state.period === tab.id}
              onClick={() => state.selectPeriod(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="ranking-monitor__board" aria-live="polite">
          <div className="ranking-monitor__table-head">
            <span>#</span>
            <span>Jogador</span>
            <span>Vitórias</span>
          </div>
          <div className="ranking-monitor__rows">
            {state.board.entries.map((entry) => {
              const isSelf = entry.playerId === 'p_local';
              return (
                <div
                  key={`${entry.playerId}-${entry.rank}`}
                  className={`ranking-monitor__row${isSelf ? ' is-self' : ''}`}
                >
                  <span className="ranking-monitor__rank">{entry.rank}</span>
                  <span className="ranking-monitor__name">{entry.displayName}</span>
                  <span className="ranking-monitor__wins">
                    {entry.wins.toLocaleString('pt-BR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="ranking-monitor__footnote">
          {state.board.title} — vitórias no torneio da arena
        </p>
      </div>
    </MovablePanelFrame>
  );
}

import { useMemo } from 'react';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useReleaseWorldHudOnPanelClose } from '../../../panels/useReleaseWorldHudOnPanelClose.js';
import {
  resolveRankingMonitorFromContext,
  useRankingMonitorPanelState,
} from '../../../panels/useRankingMonitorPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldRankingMonitorPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

/**
 * Computador da Arena (cidade 01) — HUD só de PvP ranqueado.
 * Level / moveset / PvE / PvP casual NÃO entram aqui (vitrine = login).
 */
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
      titleMeta="// PVP RANKED // CIDADE 01"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--ranking-monitor ui-panel--ranking-monitor ui-panel--npc-hybrid ui-skin-hybrid"
      panelStyle={{ width: 'min(440px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('rankingMonitor')}
      onClose={() => tryCloseReactWorldPanel('rankingMonitor')}
    >
      <div className="ranking-monitor">
        <p className="ranking-monitor__tag">ARENA // PVP RANQUEADO</p>

        <section className="ranking-monitor__structure" aria-label="Estrutura do PvP ranqueado">
          <h3 className="ranking-monitor__section-title">Estrutura</h3>
          <ul className="ranking-monitor__structure-list">
            <li>Fila 1x1 no púlpito (<strong>combate_pvp</strong>) — aposta livre (mín. 50 V), trava e countdown 10s.</li>
            <li>Placar: +1 vitória / −1 derrota (mín. 0). Pote: vencedor leva a soma menos 5% da casa.</li>
            <li>
              Board: Top 10. Entra na primeira luta; depois só sobe quem tem mais pontos.
            </li>
            <li>PvP casual / batalha normal e ranks de nível/moveset/PvE — fora deste terminal.</li>
          </ul>
        </section>

        <section className="ranking-monitor__board-wrap" aria-label="Ranking de vitórias ranqueadas">
          <h3 className="ranking-monitor__section-title">
            {state.snapshot?.title ?? 'Ranking PvP Ranqueado'}
          </h3>
          <div className="ranking-monitor__board" aria-live="polite">
            <div className="ranking-monitor__table-head">
              <span>#</span>
              <span>Jogador</span>
              <span>{state.snapshot?.scoreHeader ?? 'Pontos'}</span>
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
              ? 'sem registros ranqueados ainda'
              : 'atualiza a cada 4s — só PvP ranqueado da cidade'}
        </p>
      </div>
    </MovablePanelFrame>
  );
}

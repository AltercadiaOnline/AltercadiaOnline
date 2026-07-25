import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { useAuthoritativeWorldVitalsStrip } from '../../hooks/usePlayerHudStores.js';
import { useHudViewMode, useIsInGame } from '../../hooks/useAppUiSurface.js';
import { useAlignHudFrameToGameStage } from '../../hooks/useAlignHudFrameToGameStage.js';
import { UI_LAYER_Z_INDEX } from '../../shell/uiLayers.js';
import { prefetchHeavyWorldPanels } from '../../panels/prefetchHeavyWorldPanels.js';
import {
  hidePlayerHpTooltip,
  showPlayerHpTooltip,
} from '../../../ui/equipment/playerHpTooltip.js';
import { WorldHUD } from './WorldHUD.js';
import { WorldPanelsLayer } from './WorldPanelsLayer.js';
import { WorldPveEncounterHud } from './WorldPveEncounterHud.js';

function PlayerVitalsStrip() {
  const { displayName, level, hpCurrent, hpMax, gold } = useAuthoritativeWorldVitalsStrip();
  const hpPct = hpMax > 0 ? Math.round((hpCurrent / hpMax) * 100) : 0;

  return (
    <div className="player-vitals-strip">
      <div className="player-vitals-strip__row">
        <div>
          <div className="player-vitals-strip__name">{displayName}</div>
          <div className="player-vitals-strip__level">Nível {level}</div>
        </div>
        <div className="player-vitals-strip__wallet">
          {gold.voltsFormatted} · {gold.alterFormatted}
        </div>
      </div>
      <div
        className="player-vitals-strip__hp-block"
        onMouseEnter={(event) => showPlayerHpTooltip(event.clientX, event.clientY)}
        onMouseMove={(event) => showPlayerHpTooltip(event.clientX, event.clientY)}
        onMouseLeave={() => hidePlayerHpTooltip()}
      >
        <div className="player-vitals-strip__bar-track">
          <div
            className="player-vitals-strip__bar-fill"
            style={{ width: `${hpPct}%` }}
            role="progressbar"
            aria-valuenow={hpCurrent}
            aria-valuemin={0}
            aria-valuemax={hpMax}
            aria-label="Vida do operativo"
          />
        </div>
        <div className="player-vitals-strip__hp">
          {hpCurrent}/{hpMax} HP
        </div>
      </div>
    </div>
  );
}

/**
 * Shell World — frame cobre o retângulo visual do Construct (screen-space).
 * Hub/chat/vitals sobrescrevem o mapa sem herdar o scale do stage.
 */
export function WorldSceneShell() {
  const inGame = useIsInGame();
  const viewMode = useHudViewMode();
  const renderEngine = useGameStore((state) => state.renderEngine);
  const frameRef = useRef<HTMLDivElement>(null);
  useAlignHudFrameToGameStage(frameRef);

  useEffect(() => {
    if (!inGame || viewMode !== 'world') return undefined;

    const run = () => {
      prefetchHeavyWorldPanels();
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(run, 800);
    return () => window.clearTimeout(timeoutId);
  }, [inGame, viewMode]);

  if (!inGame || viewMode !== 'world') {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: UI_LAYER_Z_INDEX.worldSceneShell }}
      data-ui-surface="world-scene-shell"
      data-render-engine={renderEngine}
    >
      <div
        ref={frameRef}
        className="world-hud-frame pointer-events-none"
        data-ui-surface="world-hud-frame"
      >
        <header className="player-vitals-strip-anchor pointer-events-auto absolute left-2 top-2 z-[5]">
          <PlayerVitalsStrip />
        </header>

        <WorldHUD />
        <WorldPanelsLayer />
        <WorldPveEncounterHud />
      </div>
    </div>
  );
}

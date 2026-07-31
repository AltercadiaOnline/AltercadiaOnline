import { useRef } from 'react';
import { useBattleHudStore } from '../../battle/battleHudStore.js';
import { requestBattleItem, requestBattleMove } from '../../battle/battlePaletteHandlers.js';
import { useAlignHudFrameToGameStage } from '../../hooks/useAlignHudFrameToGameStage.js';
import { useBattleLayoutChrome } from '../../hooks/useBattleLayoutChrome.js';
import { useGameStore, usePlayerLevel } from '../../store/gameStore.js';
import { UI_LAYER_Z_INDEX } from '../../shell/uiLayers.js';
import { BattleBottomStrip } from './BattleBottomStrip.js';
import { BattleVitalsRow } from './BattleVitalsRow.js';

/**
 * Shell de combate — playfield segmentado: HUD fixa em cima/baixo, arena no centro.
 */
export function BattleHUD() {
  const viewMode = useGameStore((state) => state.viewMode);
  const active = useBattleHudStore(
    (state) => state.controllerReady && state.battleHudActive,
  );
  const status = useBattleHudStore((state) => state.status);
  const playerLevel = usePlayerLevel();
  const frameRef = useRef<HTMLDivElement>(null);
  useAlignHudFrameToGameStage(frameRef);
  useBattleLayoutChrome(frameRef);

  if (viewMode !== 'battle' || !active) {
    return null;
  }

  return (
    <div
      className="battle-hud-shell game-playfield-hud pointer-events-none absolute inset-0"
      style={{
        zIndex: UI_LAYER_Z_INDEX.battleHud,
        right: 'var(--game-hud-sidebar-width)',
      }}
      data-ui-surface="battle-hud"
      data-battle-status={status}
      data-player-level={playerLevel}
    >
      <div
        ref={frameRef}
        className="battle-hud-frame pointer-events-none"
        data-ui-surface="battle-hud-frame"
      >
        <div className="battle-hud-shell__chrome flex min-h-0 h-full flex-col">
          <div className="battle-hud-top-chrome pointer-events-auto flex-shrink-0">
            <BattleVitalsRow />
          </div>

          <div className="battle-hud-shell__spacer min-h-0 flex-1 pointer-events-none" aria-hidden="true" />

          <BattleBottomStrip
            requestMove={requestBattleMove}
            requestItem={requestBattleItem}
          />
        </div>
      </div>
    </div>
  );
}

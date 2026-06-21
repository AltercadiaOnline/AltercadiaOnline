import { requestBattleItem, requestBattleMove } from '../../battle/battlePaletteHandlers.js';
import { useBattleHud } from '../../battle/battleHudStore.js';
import { usePlayerData } from '../../store/gameStore.js';
import { UI_LAYER_Z_INDEX } from '../../shell/uiLayers.js';
import { BattleChatPanel } from './BattleChatPanel.js';
import { BattleCommandBarHud } from './BattleCommandBarHud.js';
import { BattleItemsPalette } from './BattleItemsPalette.js';
import { BattleLogPanel } from './BattleLogPanel.js';
import { BattleMovesetPalette } from './BattleMovesetPalette.js';
import { BattleVitalsRow } from './BattleVitalsRow.js';

/**
 * HUD de combate — overlay React sobre Phaser (#game-react-hud-root).
 * Estado unificado via `useBattleHud` (Zustand + BattleHudController).
 */
export function BattleHUD() {
  const hud = useBattleHud();
  const playerData = usePlayerData();

  if (!hud) {
    return null;
  }

  return (
    <div
      className="battle-hud-shell pointer-events-none absolute inset-0 flex flex-col overflow-hidden"
      style={{ zIndex: UI_LAYER_Z_INDEX.battleHud }}
      data-ui-surface="battle-hud"
      data-battle-status={hud.status}
      data-player-level={playerData.level}
    >
      <div className="battle-hud-shell__chrome flex min-h-0 flex-1 flex-col">
        <BattleVitalsRow hud={hud} />

        <div className="battle-hud-shell__spacer min-h-0 flex-1" aria-hidden="true" />

        <div className="battle-hud-shell__controls mt-auto flex flex-col justify-end">
          <section className="battle-command-middle pointer-events-auto" aria-label="Comandos">
            {hud.movesetDrawerOpen ? (
              <BattleMovesetPalette
                moves={hud.movesetMoves}
                enabled={hud.movesetEnabled}
                turnBlocked={hud.paletteTurnBlocked}
                onSelectMove={requestBattleMove}
              />
            ) : null}
            {hud.itemsDrawerOpen ? (
              <BattleItemsPalette
                items={hud.itemRows}
                enabled={hud.itemsEnabled}
                turnBlocked={hud.paletteTurnBlocked}
                onUseItem={requestBattleItem}
              />
            ) : null}
            <BattleCommandBarHud locked={hud.commandBarLocked} />
          </section>

          <footer className="battle-terminal-footer pointer-events-auto">
            <BattleLogPanel lines={hud.logLines} />
            <BattleChatPanel lines={hud.chatLines} />
          </footer>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { requestBattleItem, requestBattleMove } from '../../battle/battlePaletteHandlers.js';
import { getBattleHudBridge, type BattleHudBridgeSnapshot } from '../../bridge/battleHudBridge.js';
import { useBattleData, usePlayerData } from '../../store/gameStore.js';
import { BattleChatPanel } from './BattleChatPanel.js';
import { BattleCommandBarHud } from './BattleCommandBarHud.js';
import { BattleItemsPalette } from './BattleItemsPalette.js';
import { BattleLogPanel } from './BattleLogPanel.js';
import { BattleMovesetPalette } from './BattleMovesetPalette.js';
import { BattleVitalsRow } from './BattleVitalsRow.js';

function readBattleHudSnapshot(): BattleHudBridgeSnapshot {
  return getBattleHudBridge().snapshot();
}

/**
 * HUD de combate — independente de WorldHUD.
 * battleData (Zustand) + battleHudBridge (espelho autoritativo da arena).
 */
export function BattleHUD() {
  const battleData = useBattleData();
  const playerData = usePlayerData();
  const [hud, setHud] = useState<BattleHudBridgeSnapshot>(() => readBattleHudSnapshot());

  useEffect(() => getBattleHudBridge().subscribe(setHud), []);

  if (!battleData || !hud.controllerReady || !hud.battleHudActive) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[921] flex flex-col overflow-hidden"
      data-ui-surface="battle-hud"
      data-battle-status={battleData.status}
      data-player-level={playerData.level}
    >
      <BattleVitalsRow hud={hud} />

      <div className="mt-auto flex flex-col justify-end">
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
  );
}

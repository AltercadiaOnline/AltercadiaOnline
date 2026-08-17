import { GameShell } from './GameShell.js';
import { GameHudSidebar } from './hud/GameHudSidebar.js';
import { HudErrorBoundary } from './HudErrorBoundary.js';
import { useHudViewMode, useIsInGame } from '../hooks/useAppUiSurface.js';
import { BattleHUD } from './battle/BattleHUD.js';
import { WorldPanelsLayer } from './world/WorldPanelsLayer.js';
import { WorldSceneShell } from './world/WorldSceneShell.js';
import { MemoryTerminalReactBridge } from './world/MemoryTerminalReactBridge.js';
import { SprayInspectHud } from './world/hud/SprayInspectHud.js';
import { PlayerInspectHud } from './world/hud/PlayerInspectHud.js';
import { CasualDuelInviteHud } from './world/hud/CasualDuelInviteHud.js';
import { PlayerTradeHud } from './world/hud/PlayerTradeHud.js';

/**
 * HUD in-game — ownership limpo:
 * - Visível quando `appScreenBridge.activeScreen === 'game-container'`
 * - World vs Battle via `GameStateManager`
 * - Sidebar fixa: sempre montada (mundo e batalha); playfield não a cobre.
 * - Painéis móveis (F/I/…) no nível do App (z 940), fora do frame 640×360 —
 *   senão a Ficha (960px) nasce clipada / sob a sidebar.
 */
export function App() {
  const inGame = useIsInGame();
  const viewMode = useHudViewMode();

  if (!inGame) {
    return <GameShell>{null}</GameShell>;
  }

  return (
    <GameShell>
      <HudErrorBoundary
        fallback={
          <aside className="game-hud-sidebar--persistent" data-ui-widget="game-sidebar" aria-label="HUD lateral">
            <div className="p-3 text-[10px] text-white/50">HUD indisponível</div>
          </aside>
        }
      >
        <GameHudSidebar />
      </HudErrorBoundary>

      {viewMode === 'world' ? (
        <HudErrorBoundary
          fallback={(
            <div className="pointer-events-auto absolute left-2 top-2 z-[5] rounded border border-[#c9a227]/50 bg-[rgba(5,10,13,0.92)] px-3 py-2 text-[11px] text-[#ecdcc4]">
              HUD do mundo falhou. Recarregue (Ctrl+Shift+R) se o Hub sumir.
            </div>
          )}
        >
          <WorldSceneShell />
        </HudErrorBoundary>
      ) : null}

      {/* Overlays irmãos da sidebar — cada um isolado para um #185 não apagar Hub/chat. */}
      {viewMode === 'world' ? (
        <HudErrorBoundary fallback={null}>
          <WorldPanelsLayer />
        </HudErrorBoundary>
      ) : null}
      {viewMode === 'world' ? (
        <HudErrorBoundary fallback={null}>
          <MemoryTerminalReactBridge />
        </HudErrorBoundary>
      ) : null}
      {viewMode === 'world' ? (
        <HudErrorBoundary fallback={null}>
          <SprayInspectHud />
          <PlayerInspectHud />
          <CasualDuelInviteHud />
        </HudErrorBoundary>
      ) : null}
      {viewMode === 'world' ? (
        <HudErrorBoundary fallback={null}>
          <PlayerTradeHud />
        </HudErrorBoundary>
      ) : null}

      {viewMode === 'battle' ? (
        <HudErrorBoundary
          fallback={(
            <div className="pointer-events-auto absolute left-2 top-2 z-[5] rounded border border-[#c9a227]/50 bg-[rgba(5,10,13,0.92)] px-3 py-2 text-[11px] text-[#ecdcc4]">
              HUD de combate falhou. Recarregue (Ctrl+Shift+R).
            </div>
          )}
        >
          <BattleHUD />
        </HudErrorBoundary>
      ) : null}
    </GameShell>
  );
}

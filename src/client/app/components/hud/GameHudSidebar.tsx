import { WorldEquipmentSidebar } from '../world/hud/WorldEquipmentSidebar.js';
import { WorldMinimapPanel } from '../world/hud/WorldMinimapPanel.js';
import { WorldWalletPanel } from '../world/hud/WorldWalletPanel.js';
import { useGameStore } from '../../store/gameStore.js';

/**
 * Coluna direita fixa — mesma âncora no mapa (World) e na arena (Battle).
 * Reserva espaço via `padding-right` em `#game-container` (styles.css).
 */
export function GameHudSidebar() {
  const worldHudActive = useGameStore((state) => state.worldHudActive);

  return (
    <aside
      className={`sidebar game-layout__sidebar hud-sidebar equipment-sidebar-host game-hud-sidebar--persistent ${worldHudActive ? 'pointer-events-auto' : 'pointer-events-none opacity-80'}`}
      aria-label="HUD lateral"
      data-ui-widget="game-sidebar"
      aria-hidden={!worldHudActive}
    >
      <WorldMinimapPanel interactive={worldHudActive} />
      <WorldWalletPanel />
      <WorldEquipmentSidebar interactive={worldHudActive} />
    </aside>
  );
}

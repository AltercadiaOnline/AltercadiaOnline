import { WorldEquipmentSidebarWidget } from '../world/hud/WorldEquipmentSidebarWidget.js';
import { WorldMinimapWidget } from '../world/hud/WorldMinimapWidget.js';
import { WorldWalletWidget } from '../world/hud/WorldWalletWidget.js';

/**
 * Coluna direita fixa — mesma âncora no mapa (World) e na arena (Battle).
 * Reserva espaço via `padding-right` em `#game-container` (styles.css).
 */
export function GameHudSidebar() {
  return (
    <aside
      className="sidebar game-layout__sidebar hud-sidebar equipment-sidebar-host game-hud-sidebar--persistent pointer-events-auto"
      aria-label="HUD lateral"
      data-ui-widget="game-sidebar"
    >
      <WorldMinimapWidget />
      <WorldWalletWidget />
      <WorldEquipmentSidebarWidget />
    </aside>
  );
}

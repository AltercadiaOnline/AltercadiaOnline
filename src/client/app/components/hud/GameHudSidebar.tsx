import { WorldEquipmentSidebar } from '../world/hud/WorldEquipmentSidebar.js';
import { WorldMinimapPanel } from '../world/hud/WorldMinimapPanel.js';
import { WorldWalletPanel } from '../world/hud/WorldWalletPanel.js';

/**
 * Coluna direita fixa da tela — independente de mundo/batalha.
 * Não escala com o stage; o playfield reserva `right: --game-hud-sidebar-width`.
 */
export function GameHudSidebar() {
  return (
    <aside
      className="sidebar game-layout__sidebar hud-sidebar equipment-sidebar-host game-hud-sidebar--persistent pointer-events-auto"
      aria-label="HUD lateral"
      data-ui-widget="game-sidebar"
      data-ui-surface="persistent-sidebar"
    >
      <WorldMinimapPanel interactive />
      <WorldWalletPanel />
      <WorldEquipmentSidebar interactive />
    </aside>
  );
}

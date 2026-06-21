import { WorldEquipmentSidebarWidget } from './WorldEquipmentSidebarWidget.js';
import { WorldMinimapWidget } from './WorldMinimapWidget.js';
import { WorldWalletWidget } from './WorldWalletWidget.js';

/** Coluna direita — minimapa, carteira e grade SET (mount híbrido legado). */
export function WorldHudSidebar() {
  return (
    <aside
      className="sidebar game-layout__sidebar hud-sidebar equipment-sidebar-host pointer-events-auto absolute right-0 top-0 z-10 h-full"
      aria-label="HUD lateral"
      data-ui-widget="world-sidebar"
    >
      <WorldMinimapWidget />
      <WorldWalletWidget />
      <WorldEquipmentSidebarWidget />
    </aside>
  );
}

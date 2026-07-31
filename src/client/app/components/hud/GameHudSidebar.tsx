import { WorldEquipmentSidebar } from '../world/hud/WorldEquipmentSidebar.js';
import { WorldMinimapPanel } from '../world/hud/WorldMinimapPanel.js';
import { WorldSidebarConsumablesHotbar } from '../world/hud/WorldSidebarConsumablesHotbar.js';
import { WorldSidebarPetCompact } from '../world/hud/WorldSidebarPetCompact.js';
import { WorldWalletPanel } from '../world/hud/WorldWalletPanel.js';
import { UI_LAYER_Z_INDEX } from '../../shell/uiLayers.js';

/**
 * Coluna direita fixa — segmentos: mapa · moedas · vitals/SET · itens/pet.
 * Independente de mundo/batalha; playfield reserva `--game-hud-sidebar-width`.
 */
export function GameHudSidebar() {
  return (
    <aside
      className="sidebar game-layout__sidebar hud-sidebar equipment-sidebar-host game-hud-sidebar--persistent ui-skin-hybrid pointer-events-auto"
      aria-label="HUD lateral"
      data-ui-widget="game-sidebar"
      data-ui-surface="persistent-sidebar"
      style={{ zIndex: UI_LAYER_Z_INDEX.persistentSidebar }}
    >
      <section className="sidebar-segment sidebar-segment--map" aria-label="Minimapa">
        <p className="sidebar-segment__label">MAPA</p>
        <WorldMinimapPanel interactive />
      </section>

      <section className="sidebar-segment sidebar-segment--wallet" aria-label="Moedas">
        <p className="sidebar-segment__label">MOEDAS</p>
        <WorldWalletPanel />
      </section>

      <section className="sidebar-segment sidebar-segment--status" aria-label="Status e equipamentos">
        <WorldEquipmentSidebar interactive />
      </section>

      <section className="sidebar-segment sidebar-segment--utility" aria-label="Itens e pet">
        <WorldSidebarConsumablesHotbar interactive />
        <WorldSidebarPetCompact />
      </section>
    </aside>
  );
}

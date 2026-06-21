import { WorldCommsStack } from './hud/WorldCommsStack.js';
import { WorldEquipmentSidebarWidget } from './hud/WorldEquipmentSidebarWidget.js';
import { WorldMinimapWidget } from './hud/WorldMinimapWidget.js';

/**
 * Widgets globais de exploração dentro do frame 640×360.
 * Chat: canto inferior direito · SET/conjuntos: canto superior direito · minimapa: superior esquerdo.
 */
export function WorldHUD() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      data-ui-surface="world-hud"
    >
      <div className="world-hud-frame pointer-events-none">
        <div className="world-hud-minimap-corner">
          <WorldMinimapWidget />
        </div>
        <div className="world-hud-equipment-corner">
          <WorldEquipmentSidebarWidget />
        </div>
        <WorldCommsStack />
      </div>
    </div>
  );
}

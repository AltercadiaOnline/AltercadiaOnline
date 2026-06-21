import { WorldCommsStack } from './hud/WorldCommsStack.js';
import { WorldHudSidebar } from './hud/WorldHudSidebar.js';

/**
 * Widgets globais de exploração — minimapa, carteira, equip, chat e log.
 * Vitals rápidos + Hub ficam em WorldSceneShell; painéis em WorldPanelsLayer.
 */
export function WorldHUD() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-ui-surface="world-hud"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-none relative h-[360px] w-[640px] max-h-full max-w-full">
          <WorldCommsStack />
        </div>
      </div>

      <WorldHudSidebar />
    </div>
  );
}

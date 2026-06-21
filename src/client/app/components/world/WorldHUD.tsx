import { WorldCommsStack } from './hud/WorldCommsStack.js';

/**
 * Widgets dentro do frame 640×360 — chat/log no canto inferior direito.
 * Minimapa, carteira e SET ficam na coluna fixa `GameHudSidebar`.
 */
export function WorldHUD() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      data-ui-surface="world-hud"
    >
      <div className="world-hud-frame pointer-events-none">
        <WorldCommsStack />
      </div>
    </div>
  );
}

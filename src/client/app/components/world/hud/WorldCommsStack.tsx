import { WorldGlobalChatWidget } from './WorldGlobalChatWidget.js';
import { WorldLogServiceWidget } from './WorldLogServiceWidget.js';

/** Stack inferior-direita — log do sistema + chat global (640×360). */
export function WorldCommsStack() {
  return (
    <div className="exploration-comms-stack pointer-events-auto">
      <WorldLogServiceWidget />
      <WorldGlobalChatWidget />
    </div>
  );
}

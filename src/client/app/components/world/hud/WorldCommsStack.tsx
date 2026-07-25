import { WorldGlobalChatWidget } from './WorldGlobalChatWidget.js';
import { WorldLogServiceWidget } from './WorldLogServiceWidget.js';

/** Stack inferior-esquerda — log do sistema + chat global (screen-space). */
export function WorldCommsStack() {
  return (
    <div className="exploration-comms-stack pointer-events-auto">
      <WorldLogServiceWidget />
      <WorldGlobalChatWidget />
    </div>
  );
}

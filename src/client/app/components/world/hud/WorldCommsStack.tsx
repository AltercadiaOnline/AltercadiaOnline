import { WorldGlobalChatWidget } from './WorldGlobalChatWidget.js';
import { WorldLogServiceWidget } from './WorldLogServiceWidget.js';

/** Stack inferior-esquerda — log do sistema + chat global (screen-space).
 * Wrapper NÃO captura clique. Chat/log têm auto, mas o direito no peer
 * atravessa o feed — a caixa ~248px não pode cobrir o centro da câmera.
 */
export function WorldCommsStack() {
  return (
    <div className="exploration-comms-stack">
      <WorldLogServiceWidget />
      <WorldGlobalChatWidget />
    </div>
  );
}

import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';

type IntentPendingListener = () => void;

/**
 * Store de UI — espelha pending intents para desabilitar botões/ações.
 * Equivalente ao `useStore(state => state.isIntentPending(intentId))` do exemplo React.
 */
class UIIntentStore {
  isPending(intentId: string): boolean {
    return getPendingIntentRegistry().isPending(intentId);
  }

  /** @deprecated Use isPending */
  isIntentPending(intentId: string): boolean {
    return this.isPending(intentId);
  }

  subscribe(listener: IntentPendingListener): () => void {
    return getPendingIntentRegistry().subscribeChange(listener);
  }
}

let store: UIIntentStore | null = null;

export function getUIIntentStore(): UIIntentStore {
  if (!store) store = new UIIntentStore();
  return store;
}

export function resetUIIntentStore(): void {
  store = null;
}

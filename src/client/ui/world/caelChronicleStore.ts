import {
  createEmptyCaelChronicleProgress,
  sanitizeCaelChronicleProgress,
  type CaelChronicleProgress,
} from '../../../shared/world/caelChronicleBook.js';

type Listener = () => void;

let progress: CaelChronicleProgress = createEmptyCaelChronicleProgress();
const listeners = new Set<Listener>();

function publish(): void {
  for (const listener of listeners) listener();
}

export function getCaelChronicleStore(): {
  readonly getSnapshot: () => CaelChronicleProgress;
  readonly subscribe: (listener: Listener) => () => void;
  readonly applyAuthoritative: (raw: unknown) => void;
  readonly reset: () => void;
} {
  return {
    getSnapshot: () => progress,
    subscribe: (listener) => {
      listeners.add(listener);
      listener();
      return () => listeners.delete(listener);
    },
    applyAuthoritative: (raw) => {
      progress = sanitizeCaelChronicleProgress(raw);
      publish();
    },
    reset: () => {
      progress = createEmptyCaelChronicleProgress();
      publish();
    },
  };
}

export function resetCaelChronicleStore(): void {
  getCaelChronicleStore().reset();
}

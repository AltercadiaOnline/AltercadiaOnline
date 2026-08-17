import {
  createEmptyMercenaryQuestProgress,
  sanitizeMercenaryQuestProgress,
} from '../../../shared/quests/mercenaryQuestProgress.js';
import type { MercenaryQuestProgress } from '../../../shared/quests/mercenaryQuestTypes.js';

type Listener = () => void;

let progress: MercenaryQuestProgress = createEmptyMercenaryQuestProgress();
const listeners = new Set<Listener>();

function publish(): void {
  for (const listener of listeners) listener();
}

export function getMercenaryQuestStore(): {
  readonly getSnapshot: () => MercenaryQuestProgress;
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
      progress = sanitizeMercenaryQuestProgress(raw);
      publish();
    },
    reset: () => {
      progress = createEmptyMercenaryQuestProgress();
      publish();
    },
  };
}

export function resetMercenaryQuestStore(): void {
  getMercenaryQuestStore().reset();
}

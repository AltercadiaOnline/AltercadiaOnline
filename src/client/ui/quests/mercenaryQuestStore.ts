import {
  createEmptyMercenaryQuestProgress,
  sanitizeMercenaryQuestProgress,
} from '../../../shared/quests/mercenaryQuestProgress.js';
import type { MercenaryQuestProgress } from '../../../shared/quests/mercenaryQuestTypes.js';

type Listener = () => void;

let progress: MercenaryQuestProgress = createEmptyMercenaryQuestProgress();
const listeners = new Set<Listener>();

/** Evita full-state stale (pedido antes do ACK) apagar o espelho logo após intent. */
let suppressFullStateUntilMs = 0;
const FULL_STATE_SUPPRESS_MS = 2_500;

function publish(): void {
  for (const listener of listeners) listener();
}

function sameCompletedSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * Full-state serializado antes do ACCEPT pode chegar depois do ACK e zerar o tracker.
 * Não regressar ativo→vazio se completed não mudou (abandon/complete mudam o slice de outro jeito).
 */
export function shouldKeepLocalMercenaryOverFullState(
  local: MercenaryQuestProgress,
  incoming: MercenaryQuestProgress,
): boolean {
  if (!local.activeQuestId) return false;
  if (incoming.activeQuestId) return false;
  return sameCompletedSet(local.completedQuestIds, incoming.completedQuestIds);
}

export function getMercenaryQuestStore(): {
  readonly getSnapshot: () => MercenaryQuestProgress;
  readonly subscribe: (listener: Listener) => () => void;
  readonly applyAuthoritative: (raw: unknown) => void;
  readonly applyFromFullState: (raw: unknown) => void;
  readonly reset: () => void;
} {
  return {
    getSnapshot: () => progress,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    applyAuthoritative: (raw) => {
      progress = sanitizeMercenaryQuestProgress(raw);
      suppressFullStateUntilMs = Date.now() + FULL_STATE_SUPPRESS_MS;
      publish();
    },
    applyFromFullState: (raw) => {
      if (Date.now() < suppressFullStateUntilMs) {
        return;
      }
      const incoming = sanitizeMercenaryQuestProgress(raw);
      if (shouldKeepLocalMercenaryOverFullState(progress, incoming)) {
        return;
      }
      progress = incoming;
      publish();
    },
    reset: () => {
      progress = createEmptyMercenaryQuestProgress();
      suppressFullStateUntilMs = 0;
      publish();
    },
  };
}

export function resetMercenaryQuestStore(): void {
  getMercenaryQuestStore().reset();
}

export function isMercenaryQuestClientActionType(type: string): boolean {
  return (
    type === 'ACCEPT_MERCENARY_TASK'
    || type === 'ABANDON_MERCENARY_TASK'
    || type === 'COMPLETE_MERCENARY_TASK'
    || type === 'MERCENARY_QUEST_INTERACT'
  );
}

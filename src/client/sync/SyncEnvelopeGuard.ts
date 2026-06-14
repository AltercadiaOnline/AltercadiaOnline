import {
  shouldApplySyncEnvelope,
  type StateSyncPayload,
  type SyncApplyDecision,
  type SyncCursor,
  type SyncEnvelope,
} from '../../shared/sync/syncProtocol.js';

/**
 * Cursor local — descarta pacotes SYNC atrasados (lag / time travel).
 */
export class SyncEnvelopeGuard {
  private cursor: SyncCursor | null = null;

  evaluate(envelope: SyncEnvelope): SyncApplyDecision {
    return shouldApplySyncEnvelope(this.cursor, envelope);
  }

  commit(envelope: SyncEnvelope): void {
    this.cursor = {
      syncSeq: envelope.syncSeq,
      serverTimeMs: envelope.serverTimeMs,
    };
  }

  /** Reconnect — próximo full sync com force repovoa o cursor. */
  reset(): void {
    this.cursor = null;
  }

  getCursor(): SyncCursor | null {
    return this.cursor ? { ...this.cursor } : null;
  }

  shouldApply(payload: StateSyncPayload): SyncApplyDecision {
    return this.evaluate(payload);
  }

  applyCommit(payload: StateSyncPayload): void {
    this.commit(payload);
  }
}

let guard: SyncEnvelopeGuard | null = null;

export function getSyncEnvelopeGuard(): SyncEnvelopeGuard {
  if (!guard) guard = new SyncEnvelopeGuard();
  return guard;
}

export function resetSyncEnvelopeGuard(): void {
  guard = null;
}

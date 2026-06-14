import type { SyncEnvelope, SyncKind } from '../../shared/sync/syncProtocol.js';

/**
 * Gera envelopes SYNC monotônicos — única fonte de seq/tempo no servidor.
 */
export class ServerSyncAuthority {
  private syncSeq = 0;
  private tick = 0;

  nextEnvelope(kind: SyncKind, options: { readonly force?: boolean } = {}): SyncEnvelope {
    this.syncSeq += 1;
    const envelope: SyncEnvelope = {
      syncSeq: this.syncSeq,
      serverTimeMs: Date.now(),
      kind,
    };
    if (options.force === true) {
      return { ...envelope, force: true };
    }
    return envelope;
  }

  advanceTick(): number {
    this.tick += 1;
    return this.tick;
  }

  getCurrentTick(): number {
    return this.tick;
  }
}

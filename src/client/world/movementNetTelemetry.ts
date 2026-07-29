/**
 * Telemetria leve de movimento online (dev + indicador de lag).
 * Não afeta autoridade — só observa.
 */

export type MovementNetSnapshot = {
  readonly rttMs: number | null;
  readonly moveQueueDepthHint: number;
  readonly hardSnaps: number;
  readonly softSilences: number;
  readonly lastUpdatedMs: number;
};

const LAG_WARN_RTT_MS = 180;
const LAG_BAD_RTT_MS = 320;

class MovementNetTelemetry {
  private rttSamples: number[] = [];
  private hardSnaps = 0;
  private softSilences = 0;
  private moveQueueDepthHint = 0;
  private lastUpdatedMs = 0;
  private readonly pendingMoveSentAt = new Map<number, number>();
  private readonly listeners = new Set<(snapshot: MovementNetSnapshot) => void>();

  subscribe(listener: (snapshot: MovementNetSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): MovementNetSnapshot {
    return {
      rttMs: this.resolveRttMs(),
      moveQueueDepthHint: this.moveQueueDepthHint,
      hardSnaps: this.hardSnaps,
      softSilences: this.softSilences,
      lastUpdatedMs: this.lastUpdatedMs,
    };
  }

  /** true quando vale mostrar “sincronizando…” (nunca trava WASD). */
  shouldShowLagHint(): boolean {
    const rtt = this.resolveRttMs();
    return rtt !== null && rtt >= LAG_WARN_RTT_MS;
  }

  lagHintLabel(): string | null {
    const rtt = this.resolveRttMs();
    if (rtt === null) return null;
    if (rtt >= LAG_BAD_RTT_MS) return 'Rede lenta';
    if (rtt >= LAG_WARN_RTT_MS) return 'Sincronizando…';
    return null;
  }

  noteMoveIntentSent(seq: number, nowMs: number = performance.now()): void {
    this.pendingMoveSentAt.set(seq, nowMs);
    if (this.pendingMoveSentAt.size > 32) {
      const oldest = this.pendingMoveSentAt.keys().next().value;
      if (oldest !== undefined) this.pendingMoveSentAt.delete(oldest);
    }
    this.moveQueueDepthHint = this.pendingMoveSentAt.size;
    this.touch(nowMs);
  }

  noteMoveSeqConfirmed(seq: number, nowMs: number = performance.now()): void {
    const sentAt = this.pendingMoveSentAt.get(seq);
    if (sentAt !== undefined) {
      this.pendingMoveSentAt.delete(seq);
      this.pushRtt(nowMs - sentAt);
    }
    // Confirmações atrasadas: limpa seqs mais antigos que este.
    for (const [pendingSeq] of this.pendingMoveSentAt) {
      if (pendingSeq <= seq) this.pendingMoveSentAt.delete(pendingSeq);
    }
    this.moveQueueDepthHint = this.pendingMoveSentAt.size;
    this.touch(nowMs);
  }

  noteHardSnap(): void {
    this.hardSnaps += 1;
    this.touch();
  }

  noteSoftSilence(): void {
    this.softSilences += 1;
    this.touch();
  }

  reset(): void {
    this.rttSamples = [];
    this.hardSnaps = 0;
    this.softSilences = 0;
    this.moveQueueDepthHint = 0;
    this.pendingMoveSentAt.clear();
    this.touch();
  }

  private pushRtt(rttMs: number): void {
    if (!Number.isFinite(rttMs) || rttMs < 0 || rttMs > 5_000) return;
    this.rttSamples.push(rttMs);
    if (this.rttSamples.length > 12) this.rttSamples.shift();
  }

  private resolveRttMs(): number | null {
    if (this.rttSamples.length === 0) return null;
    const sorted = [...this.rttSamples].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? null;
  }

  private touch(nowMs: number = performance.now()): void {
    this.lastUpdatedMs = nowMs;
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

let telemetry: MovementNetTelemetry | null = null;

export function getMovementNetTelemetry(): MovementNetTelemetry {
  if (!telemetry) telemetry = new MovementNetTelemetry();
  return telemetry;
}

export function resetMovementNetTelemetry(): void {
  telemetry?.reset();
  telemetry = null;
}

export { LAG_WARN_RTT_MS, LAG_BAD_RTT_MS };

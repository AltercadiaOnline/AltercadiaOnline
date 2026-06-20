export type CriticalPersistEventKind =
  | 'inventory'
  | 'bank'
  | 'wallet'
  | 'alter_exchange';

export type CriticalPersistMetricSample = {
  readonly kind: CriticalPersistEventKind;
  readonly playerId: string;
  readonly characterId: number;
  readonly revision: number;
  readonly debounceMs: number;
  readonly saveMs: number;
  readonly totalMs: number;
  readonly ok: boolean;
  readonly recordedAt: number;
};

const MAX_SAMPLES = 120;

const samples: CriticalPersistMetricSample[] = [];

function eventKindFromType(type: string): CriticalPersistEventKind {
  switch (type) {
    case 'INVENTORY_UPDATE':
      return 'inventory';
    case 'UPDATE_BANK_SUCCESS':
      return 'bank';
    case 'WALLET_UPDATE':
      return 'wallet';
    case 'ALTER_EXCHANGE_COMPLETED':
      return 'alter_exchange';
    default:
      return 'inventory';
  }
}

export function recordCriticalPersistSample(input: {
  readonly eventType: string;
  readonly playerId: string;
  readonly characterId: number;
  readonly revision: number;
  readonly debounceMs: number;
  readonly saveMs: number;
  readonly ok: boolean;
}): CriticalPersistMetricSample {
  const sample: CriticalPersistMetricSample = {
    kind: eventKindFromType(input.eventType),
    playerId: input.playerId,
    characterId: input.characterId,
    revision: input.revision,
    debounceMs: input.debounceMs,
    saveMs: input.saveMs,
    totalMs: input.debounceMs + input.saveMs,
    ok: input.ok,
    recordedAt: Date.now(),
  };

  samples.push(sample);
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }

  return sample;
}

export type CriticalPersistMetricsSummary = {
  readonly sampleCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly avgDebounceMs: number;
  readonly avgSaveMs: number;
  readonly avgTotalMs: number;
  readonly p95TotalMs: number;
  readonly recent: readonly CriticalPersistMetricSample[];
};

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

export function getCriticalPersistMetricsSummary(): CriticalPersistMetricsSummary {
  const successCount = samples.filter((row) => row.ok).length;
  const debounceValues = samples.map((row) => row.debounceMs);
  const saveValues = samples.map((row) => row.saveMs);
  const totalValues = samples.map((row) => row.totalMs);
  const avg = (values: readonly number[]) =>
    values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    sampleCount: samples.length,
    successCount,
    failureCount: samples.length - successCount,
    avgDebounceMs: Math.round(avg(debounceValues)),
    avgSaveMs: Math.round(avg(saveValues)),
    avgTotalMs: Math.round(avg(totalValues)),
    p95TotalMs: Math.round(percentile(totalValues, 95)),
    recent: samples.slice(-10),
  };
}

/** Testes / reset de estado. */
export function resetCriticalPersistMetrics(): void {
  samples.length = 0;
}

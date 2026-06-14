const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 2048;

const processed = new Map<string, number>();

function prune(now: number): void {
  for (const [intentId, expiresAt] of processed) {
    if (expiresAt <= now) processed.delete(intentId);
  }
  if (processed.size <= MAX_ENTRIES) return;

  const overflow = processed.size - MAX_ENTRIES;
  let removed = 0;
  for (const intentId of processed.keys()) {
    processed.delete(intentId);
    removed += 1;
    if (removed >= overflow) break;
  }
}

/** Evita replay de intenções bancárias (mesmo intentId não processa duas vezes). */
export function consumeBankIntent(intentId: string | undefined): boolean {
  if (!intentId || intentId.length === 0) return true;

  const now = Date.now();
  prune(now);

  if (processed.has(intentId)) return false;

  processed.set(intentId, now + TTL_MS);
  return true;
}

export function resetBankIntentLedger(): void {
  processed.clear();
}

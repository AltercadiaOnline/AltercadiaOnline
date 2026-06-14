export type RevisionCompareResult = 'apply' | 'discard' | 'duplicate';

/**
 * Decide se um snapshot autoritativo deve ser aplicado.
 * Descarta versões mais antigas (replay / pacotes atrasados).
 */
export function compareRevision(current: number, incoming: number): RevisionCompareResult {
  if (incoming < current) return 'discard';
  if (incoming === current) return 'duplicate';
  return 'apply';
}

export function shouldApplyRevision(current: number, incoming: number): boolean {
  return compareRevision(current, incoming) === 'apply';
}

export type WithRevision<T> = T & { readonly revision: number };

export function attachRevision<T extends object>(snapshot: T, revision: number): WithRevision<T> {
  return { ...snapshot, revision };
}

export function resolveIncomingRevision(current: number, incoming: number | undefined): number {
  return incoming ?? current + 1;
}

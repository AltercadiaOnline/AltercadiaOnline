let sprayRevision = 0;

export function markWorldSpraySyncDirty(): void {
  sprayRevision += 1;
}

export function buildWorldSpraySignature(
  snapshots: readonly { readonly id: string; readonly tileX: number; readonly tileY: number }[],
): string {
  if (snapshots.length === 0) return `${sprayRevision}:`;
  return `${sprayRevision}:${snapshots.map((s) => `${s.id}:${s.tileX}:${s.tileY}`).sort().join('|')}`;
}

const lastSigByConnection = new Map<string, string>();

export function shouldSendWorldSprays(connectionId: string, signature: string): boolean {
  const prev = lastSigByConnection.get(connectionId);
  if (prev === signature) return false;
  lastSigByConnection.set(connectionId, signature);
  return true;
}

export function clearWorldSpraySyncConnection(connectionId: string): void {
  lastSigByConnection.delete(connectionId);
}

export function __resetWorldSpraySyncDirtyForTests(): void {
  sprayRevision = 0;
  lastSigByConnection.clear();
}

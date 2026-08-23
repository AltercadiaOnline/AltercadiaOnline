/** Marca dirty quando holders globais ou unlocks de jogador mudam. */
let holdersRevision = 1;
const playerRevision = new Map<string, number>();

export function bumpZoneBypassHoldersRevision(): number {
  holdersRevision += 1;
  return holdersRevision;
}

export function getZoneBypassHoldersRevision(): number {
  return holdersRevision;
}

export function bumpZoneBypassPlayerRevision(playerKey: string): number {
  const next = (playerRevision.get(playerKey) ?? 0) + 1;
  playerRevision.set(playerKey, next);
  return next;
}

export function getZoneBypassPlayerRevision(playerKey: string): number {
  return playerRevision.get(playerKey) ?? 0;
}

export function buildZoneBypassSyncSignature(
  holdersRevision: number,
  playerKey: string,
  playerRevision: number,
): string {
  return `${holdersRevision}|${playerKey}|${playerRevision}`;
}

const lastSigByConnection = new Map<string, string>();

export function shouldSendZoneBypassSnapshot(
  connectionId: string,
  signature: string,
): boolean {
  const prev = lastSigByConnection.get(connectionId);
  if (prev === signature) return false;
  lastSigByConnection.set(connectionId, signature);
  return true;
}

export function clearZoneBypassSyncConnection(connectionId: string): void {
  lastSigByConnection.delete(connectionId);
}

export function __resetZoneBypassSyncDirtyForTests(): void {
  holdersRevision = 1;
  playerRevision.clear();
  lastSigByConnection.clear();
}

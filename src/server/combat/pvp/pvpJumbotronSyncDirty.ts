let lastSigByConnection = new Map<string, string>();

export function shouldSendPvpJumbotron(connectionId: string, signature: string): boolean {
  const prev = lastSigByConnection.get(connectionId);
  if (prev === signature) return false;
  lastSigByConnection.set(connectionId, signature);
  return true;
}

export function clearPvpJumbotronSyncConnection(connectionId: string): void {
  lastSigByConnection.delete(connectionId);
}

export function resetPvpJumbotronSyncDirtyForTests(): void {
  lastSigByConnection = new Map();
}

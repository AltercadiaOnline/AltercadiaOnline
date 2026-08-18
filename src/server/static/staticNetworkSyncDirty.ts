let lastSigByConnection = new Map<string, string>();

export function shouldSendStaticNetwork(connectionId: string, signature: string): boolean {
  const prev = lastSigByConnection.get(connectionId);
  if (prev === signature) return false;
  lastSigByConnection.set(connectionId, signature);
  return true;
}

export function clearStaticNetworkSyncConnection(connectionId: string): void {
  lastSigByConnection.delete(connectionId);
}

export function __resetStaticNetworkSyncDirtyForTests(): void {
  lastSigByConnection = new Map();
}

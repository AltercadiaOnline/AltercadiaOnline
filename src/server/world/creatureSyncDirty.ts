/**
 * Dirty + assinatura de sync de criaturas — evita reenviar AOI idêntica a cada tick.
 */

const dirtyMonsterIds = new Set<string>();
/** connectionId → última assinatura AOI enviada. */
const lastSigByConnection = new Map<string, string>();
/** connectionId → ticks desde full resync forçado. */
const ticksSinceFullByConnection = new Map<string, number>();

/** Reenvio completo periódico (reconciliação), em ticks de 20 Hz. */
export const CREATURE_AOI_FULL_RESYNC_TICKS = 40;

export function markCreatureSyncDirty(monsterId: string): void {
  dirtyMonsterIds.add(monsterId);
}

export function markAllCreaturesSyncDirty(): void {
  dirtyMonsterIds.add('*');
}

export function clearCreatureSyncDirty(): void {
  dirtyMonsterIds.clear();
}

export function hasCreatureSyncDirty(): boolean {
  return dirtyMonsterIds.size > 0;
}

export function isCreatureSyncDirty(monsterId: string): boolean {
  return dirtyMonsterIds.has('*') || dirtyMonsterIds.has(monsterId);
}

export function buildCreatureAoiSignature(
  snapshots: readonly { readonly instanceId: string; readonly tileX: number; readonly tileY: number; readonly worldX?: number; readonly worldY?: number; readonly facing?: string }[],
): string {
  if (snapshots.length === 0) return '';
  return snapshots
    .map((s) =>
      [
        s.instanceId,
        s.tileX,
        s.tileY,
        s.worldX ?? '',
        s.worldY ?? '',
        s.facing ?? '',
      ].join(':'),
    )
    .sort()
    .join('|');
}

/**
 * Decide se deve incluir `creatures` no state-sync deste connection.
 * Full resync a cada CREATURE_AOI_FULL_RESYNC_TICKS ou se a assinatura mudou.
 */
export function shouldSendCreatureAoi(
  connectionId: string,
  signature: string,
): boolean {
  const ticks = (ticksSinceFullByConnection.get(connectionId) ?? 0) + 1;
  ticksSinceFullByConnection.set(connectionId, ticks);

  const prev = lastSigByConnection.get(connectionId);
  const forceFull = ticks >= CREATURE_AOI_FULL_RESYNC_TICKS || prev === undefined;
  if (!forceFull && prev === signature) {
    return false;
  }

  lastSigByConnection.set(connectionId, signature);
  if (forceFull) {
    ticksSinceFullByConnection.set(connectionId, 0);
  }
  return true;
}

export function clearCreatureSyncConnection(connectionId: string): void {
  lastSigByConnection.delete(connectionId);
  ticksSinceFullByConnection.delete(connectionId);
}

export function __resetCreatureSyncDirtyForTests(): void {
  dirtyMonsterIds.clear();
  lastSigByConnection.clear();
  ticksSinceFullByConnection.clear();
}

export const INVENTORY_LOCK_TIMEOUT_MS = 30_000;

export type InventoryLockRecord = {
  readonly playerId: string;
  readonly characterId: number;
  readonly itemId: string;
  readonly quantity: number;
  readonly lockedAtMs: number;
};

function lockKey(playerId: string, characterId: number, itemId: string): string {
  return `${playerId}:${characterId}:${itemId}`;
}

class InventoryLockRegistry {
  private readonly locks = new Map<string, InventoryLockRecord>();

  track(record: InventoryLockRecord): void {
    this.locks.set(lockKey(record.playerId, record.characterId, record.itemId), record);
  }

  untrack(playerId: string, characterId: number, itemId: string): void {
    this.locks.delete(lockKey(playerId, characterId, itemId));
  }

  listExpired(nowMs = Date.now()): readonly InventoryLockRecord[] {
    const expired: InventoryLockRecord[] = [];
    for (const record of this.locks.values()) {
      if (nowMs - record.lockedAtMs >= INVENTORY_LOCK_TIMEOUT_MS) {
        expired.push(record);
      }
    }
    return expired;
  }
}

let singleton: InventoryLockRegistry | null = null;

export function getInventoryLockRegistry(): InventoryLockRegistry {
  if (!singleton) {
    singleton = new InventoryLockRegistry();
  }
  return singleton;
}

export function resetInventoryLockRegistryForTests(): void {
  singleton = null;
}

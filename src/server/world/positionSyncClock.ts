import { POSITION_SYNC_MAX_WINDOW_MS } from '../../shared/world/positionVelocityPolicy.js';

const clocks = new Map<string, number>();

export function touchPositionSyncClock(playerId: string, characterId: number, atMs = Date.now()): void {
  clocks.set(`${playerId}:${characterId}`, atMs);
}

export function elapsedSinceLastPositionSync(
  playerId: string,
  characterId: number,
  nowMs = Date.now(),
): number {
  const key = `${playerId}:${characterId}`;
  const last = clocks.get(key);
  if (last === undefined) {
    clocks.set(key, nowMs);
    return POSITION_SYNC_MAX_WINDOW_MS;
  }
  return Math.max(0, nowMs - last);
}

export function resetPositionSyncClocks(): void {
  clocks.clear();
}

import {
  BATTLE_SESSION_INACTIVITY_MS,
  BATTLE_SESSION_MAX_DURATION_MS,
} from '../../shared/combat/battleSessionLeaseConstants.js';

export type BattleSessionLease = {
  readonly connectionId: string;
  readonly playerId: string;
  readonly characterId: number;
  readonly startedAtMs: number;
  lastActivityMs: number;
};

export type BattleLeaseExpiryReason = 'inactivity' | 'max_duration';

export type ExpiredBattleLease = {
  readonly lease: BattleSessionLease;
  readonly reason: BattleLeaseExpiryReason;
};

const leasesByPlayer = new Map<string, BattleSessionLease>();

function leaseKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export function registerBattleSessionLease(
  connectionId: string,
  playerId: string,
  characterId: number,
  nowMs = Date.now(),
): void {
  leasesByPlayer.set(leaseKey(playerId, characterId), {
    connectionId,
    playerId,
    characterId,
    startedAtMs: nowMs,
    lastActivityMs: nowMs,
  });
}

export function touchBattleSessionLease(
  playerId: string,
  characterId: number,
  nowMs = Date.now(),
): void {
  const lease = leasesByPlayer.get(leaseKey(playerId, characterId));
  if (!lease) return;
  lease.lastActivityMs = nowMs;
}

export function clearBattleSessionLease(playerId: string, characterId: number): void {
  leasesByPlayer.delete(leaseKey(playerId, characterId));
}

export function getBattleSessionLease(
  playerId: string,
  characterId: number,
): BattleSessionLease | undefined {
  return leasesByPlayer.get(leaseKey(playerId, characterId));
}

export function listExpiredBattleSessionLeases(nowMs = Date.now()): ExpiredBattleLease[] {
  const expired: ExpiredBattleLease[] = [];

  for (const lease of leasesByPlayer.values()) {
    if (nowMs - lease.startedAtMs >= BATTLE_SESSION_MAX_DURATION_MS) {
      expired.push({ lease, reason: 'max_duration' });
      continue;
    }
    if (nowMs - lease.lastActivityMs >= BATTLE_SESSION_INACTIVITY_MS) {
      expired.push({ lease, reason: 'inactivity' });
    }
  }

  return expired;
}

export function resetBattleSessionLeases(): void {
  leasesByPlayer.clear();
}

/** @internal — testes */
export function __countBattleSessionLeases(): number {
  return leasesByPlayer.size;
}

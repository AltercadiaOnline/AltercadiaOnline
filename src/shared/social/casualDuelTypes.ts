export const DUEL_INVITE_ACTION = 'DUEL_INVITE' as const;
export const DUEL_INVITE_RESPOND_ACTION = 'DUEL_INVITE_RESPOND' as const;

export type DuelInvitePayload = {
  readonly targetPlayerId: string;
  readonly targetCharacterId: number;
};

export type DuelInviteRespondPayload = {
  readonly inviteId: string;
  readonly accept: boolean;
};

export const CasualDuelPhase = {
  Pending: 'pending',
  Countdown: 'countdown',
  Starting: 'starting',
  Cancelled: 'cancelled',
} as const;

export type CasualDuelPhase = (typeof CasualDuelPhase)[keyof typeof CasualDuelPhase];

export type CasualDuelCancelReason =
  | 'refused'
  | 'range'
  | 'timeout'
  | 'busy'
  | 'offline'
  | 'map'
  | 'self';

export type CasualDuelSnapshot = {
  readonly inviteId: string;
  readonly phase: CasualDuelPhase;
  readonly fromPlayerId: string;
  readonly fromCharacterId: number;
  readonly fromDisplayName: string;
  readonly toPlayerId: string;
  readonly toCharacterId: number;
  readonly toDisplayName: string;
  readonly countdownEndsAtMs: number | null;
  readonly cancelReason: CasualDuelCancelReason | null;
};

export function isCasualDuelSnapshot(value: unknown): value is CasualDuelSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const phase = record.phase;
  if (
    phase !== CasualDuelPhase.Pending
    && phase !== CasualDuelPhase.Countdown
    && phase !== CasualDuelPhase.Starting
    && phase !== CasualDuelPhase.Cancelled
  ) {
    return false;
  }
  if (typeof record.inviteId !== 'string' || record.inviteId.length === 0) return false;
  if (typeof record.fromPlayerId !== 'string') return false;
  if (typeof record.fromCharacterId !== 'number') return false;
  if (typeof record.fromDisplayName !== 'string') return false;
  if (typeof record.toPlayerId !== 'string') return false;
  if (typeof record.toCharacterId !== 'number') return false;
  if (typeof record.toDisplayName !== 'string') return false;
  if (record.countdownEndsAtMs !== null && typeof record.countdownEndsAtMs !== 'number') return false;
  if (record.cancelReason !== null && typeof record.cancelReason !== 'string') return false;
  return true;
}

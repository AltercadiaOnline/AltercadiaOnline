/**
 * Ponte fila PVP → economyGateway. Combat não muta carteira direto.
 */

import {
  lockPvpRankedDuelStake,
  settlePvpRankedDuelStake,
  unlockPvpRankedDuelStake,
} from '../../../Economy/economyGateway.js';
import { isPvpPracticeBotPlayer } from '../../../shared/combat/pvp/pvpRankedDuelStake.js';
import type { PvpRankedQueueErrorCode } from '../../../shared/combat/pvp/pvpRankedQueueProtocol.js';

export type PvpRankedStakePartyRef = {
  readonly playerId: string;
  readonly characterId: number;
  readonly stakeVolts?: number;
  readonly stakeLocked?: boolean;
};

function shouldTouchWallet(party: PvpRankedStakePartyRef): boolean {
  if (isPvpPracticeBotPlayer(party.playerId) || party.characterId < 1) return false;
  const qty = Math.floor(party.stakeVolts ?? 0);
  return qty > 0;
}

export async function lockQueuedPvpRankedStake(
  member: PvpRankedStakePartyRef,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: PvpRankedQueueErrorCode }> {
  if (!shouldTouchWallet(member) || member.stakeLocked) return { ok: true };
  const result = await lockPvpRankedDuelStake(
    { playerId: member.playerId, characterId: member.characterId },
    member.stakeVolts ?? 0,
  );
  if (!result.ok) return { ok: false, reason: 'INSUFFICIENT_VOLTS' };
  return { ok: true };
}

export async function refundPvpRankedStakeMembers(
  members: readonly PvpRankedStakePartyRef[],
): Promise<void> {
  for (const member of members) {
    if (!shouldTouchWallet(member) || member.stakeLocked === false) continue;
    const result = await unlockPvpRankedDuelStake(
      { playerId: member.playerId, characterId: member.characterId },
      member.stakeVolts ?? 0,
    );
    if (!result.ok) {
      console.error('[PvpRankedStake] falha ao devolver aposta', {
        playerId: member.playerId,
        characterId: member.characterId,
        message: result.message,
      });
    }
  }
}

export async function settleQueuedPvpRankedPot(input: {
  readonly winner: PvpRankedStakePartyRef;
  readonly loser: PvpRankedStakePartyRef;
  readonly stakeVolts: number;
}): Promise<void> {
  const qty = Math.floor(input.stakeVolts);
  if (qty <= 0) return;
  const result = await settlePvpRankedDuelStake({
    winner: { playerId: input.winner.playerId, characterId: input.winner.characterId },
    loser: { playerId: input.loser.playerId, characterId: input.loser.characterId },
    stakeVolts: qty,
  });
  if (!result.ok) {
    console.error('[PvpRankedStake] falha ao liquidar pote', {
      winner: input.winner.playerId,
      loser: input.loser.playerId,
      message: result.message,
    });
  }
}

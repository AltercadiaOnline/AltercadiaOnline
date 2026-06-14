import type { CombatDispatchPayload } from '../../../shared/combatWire.js';
import { BattleType } from '../../../shared/combat/battleType.js';
import type { BattleRankingResult } from '../../../shared/combat/battleType.js';
import { createDefaultPlayerSkin } from '../../../shared/character/playerSkin.js';
import type { PlayerHonorCardData } from '../../../shared/combat/playerHonorTypes.js';
import { resolvePvpOpponentActorId } from '../../../shared/combat/resolvePvpOpponent.js';
import { readBattleHonorStats } from './battleHonorStatsStore.js';

let activeSnapshot: PlayerHonorCardData | null = null;
let honorCountOverride = 0;

export function clearPostBattleHonorContext(): void {
  activeSnapshot = null;
  honorCountOverride = 0;
}

export function setOpponentHonorCount(count: number): void {
  honorCountOverride = Math.max(0, count);
  if (activeSnapshot) {
    activeSnapshot = { ...activeSnapshot, honorCount: honorCountOverride };
  }
}

export function getPostBattleHonorCardData(): PlayerHonorCardData | null {
  return activeSnapshot;
}

export function capturePostBattleHonorContext(
  dispatch: CombatDispatchPayload,
  battleType: BattleType,
  rankingResult?: BattleRankingResult,
): PlayerHonorCardData | null {
  if (battleType !== BattleType.PVP) {
    activeSnapshot = null;
    return null;
  }

  const opponentActorId = resolvePvpOpponentActorId(
    dispatch.state.combatants,
    dispatch.ui.playerActorId,
  );
  if (!opponentActorId) {
    activeSnapshot = null;
    return null;
  }

  const opponent = dispatch.state.combatants[opponentActorId];
  const stats = readBattleHonorStats(opponentActorId);
  const rankLabel = rankingResult?.rankAfter !== undefined
    ? `#${rankingResult.rankAfter}`
    : 'Duelista';

  activeSnapshot = {
    battleId: dispatch.state.battleId,
    opponentActorId,
    opponentName: opponent?.name ?? opponentActorId,
    opponentRankLabel: rankLabel,
    damageDealt: stats.damageDealt,
    mainHits: stats.mainHits,
    honorCount: honorCountOverride,
    opponentSkin: createDefaultPlayerSkin(),
  };

  return activeSnapshot;
}

export function tryOpenHonorCardFromChatAuthor(author: string): boolean {
  if (!activeSnapshot) return false;
  const normalized = author.trim().toLowerCase();
  if (!normalized) return false;
  if (
    normalized !== activeSnapshot.opponentName.trim().toLowerCase()
    && normalized !== activeSnapshot.opponentActorId.toLowerCase()
  ) {
    return false;
  }
  return true;
}

export function getOpponentChatAuthorLabel(): string | null {
  return activeSnapshot?.opponentName ?? null;
}
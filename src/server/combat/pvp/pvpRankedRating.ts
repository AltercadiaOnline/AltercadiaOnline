/**
 * Rating simples PVP rankeado — ±pontos no characterProfile (sem Elo sofisticado).
 */

import type { BattleRankingResult } from '../../../shared/combat/battleType.js';
import type { PersistedCharacterProfileSlice } from '../../../shared/persistence/characterPersistenceRecord.js';
import {
  getAuthoritativeProgression,
  patchAuthoritativeProgression,
} from '../../progression/authoritativeProgressionStore.js';

/** Placar de vitórias líquidas (não Elo). Começa em 0. */
export const PVP_RANKED_DEFAULT_RATING = 0;
export const PVP_RANKED_WIN_DELTA = 1;
export const PVP_RANKED_LOSS_DELTA = -1;

export type PvpRankedRatingSlice = {
  readonly pvpRating: number;
  readonly pvpWins: number;
  readonly pvpLosses: number;
};

export function readPvpRankedRating(
  profile: PersistedCharacterProfileSlice,
): PvpRankedRatingSlice {
  return {
    pvpRating: typeof profile.pvpRating === 'number' && Number.isFinite(profile.pvpRating)
      ? Math.max(0, Math.floor(profile.pvpRating))
      : PVP_RANKED_DEFAULT_RATING,
    pvpWins: typeof profile.pvpWins === 'number' && Number.isFinite(profile.pvpWins)
      ? Math.max(0, Math.floor(profile.pvpWins))
      : 0,
    pvpLosses: typeof profile.pvpLosses === 'number' && Number.isFinite(profile.pvpLosses)
      ? Math.max(0, Math.floor(profile.pvpLosses))
      : 0,
  };
}

export function applyPvpRankedRatingDelta(
  playerId: string,
  characterId: number,
  victory: boolean,
): BattleRankingResult {
  const current = getAuthoritativeProgression(playerId, characterId);
  const before = readPvpRankedRating(current.characterProfile);
  const delta = victory ? PVP_RANKED_WIN_DELTA : PVP_RANKED_LOSS_DELTA;
  const afterRating = Math.max(0, before.pvpRating + delta);
  const wins = before.pvpWins + (victory ? 1 : 0);
  const losses = before.pvpLosses + (victory ? 0 : 1);
  const matches = wins + losses;

  patchAuthoritativeProgression(playerId, characterId, {
    characterProfile: {
      pvpRating: afterRating,
      pvpWins: wins,
      pvpLosses: losses,
      pvpMatches: matches,
    },
  });

  const sign = delta >= 0 ? '+' : '';
  return {
    pointsDelta: delta,
    rankBefore: before.pvpRating,
    rankAfter: afterRating,
    summaryLabel: victory
      ? `Vitória rankeada ${sign}${delta} (${before.pvpRating} → ${afterRating})`
      : `Derrota rankeada ${sign}${delta} (${before.pvpRating} → ${afterRating})`,
  };
}

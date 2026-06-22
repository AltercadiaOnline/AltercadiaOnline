import type { BattleEndReason } from './battleEnded.js';
import type { BattleLootPreview } from '../loot/lootTypes.js';
import type { LootRevealSlot } from '../loot/lootRevealSlots.js';
import type { BattleRankingResult, BattleType } from './battleType.js';
import { isBattleRankingResult, isBattleType } from './battleType.js';
import { isLootRevealSlots, LOOT_REVEAL_SLOT_COUNT } from '../loot/lootRevealSlots.js';
import type { BattleProgressionGrant } from '../progression/battleProgressionGrant.js';
import type { DeathPenaltyOutcome } from '../progression/ProgressionPenaltyManager.js';

/** Recompensas autoritativas anexadas ao evento COMBAT_FINISHED. */
export type CombatFinishedPayload = {
  readonly battleId: string;
  readonly victory: boolean;
  readonly xpGain: number;
  readonly loot: BattleLootPreview | null;
  /** 4 resultados de slot (ordem autoritativa) — UI revela sob interação do jogador. */
  readonly lootReveal: readonly LootRevealSlot[];
  readonly endReason?: BattleEndReason;
  /** Volts debitados ao render-se (espelho de BATTLE_ENDED). */
  readonly surrenderVoltPenalty?: number;
  readonly battleType?: BattleType;
  readonly rankingResult?: BattleRankingResult;
  /** Split autoritativo — cliente espelha sem recalcular. */
  readonly progressionGrant?: BattleProgressionGrant;
  /** Penalidade de derrota aplicada no servidor — cliente só espelha. */
  readonly deathPenaltyOutcome?: DeathPenaltyOutcome;
};

export function isCombatFinishedPayload(value: unknown): value is CombatFinishedPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const loot = record.loot;
  const validLoot = loot === null || (
    typeof loot === 'object'
    && loot !== null
    && typeof (loot as Record<string, unknown>).lootId === 'string'
  );
  const battleType = record.battleType;
  const validBattleType = battleType === undefined || isBattleType(battleType);
  const rankingResult = record.rankingResult;
  const validRanking = rankingResult === undefined || isBattleRankingResult(rankingResult);
  return (
    typeof record.battleId === 'string'
    && typeof record.victory === 'boolean'
    && typeof record.xpGain === 'number'
    && Number.isFinite(record.xpGain)
    && validLoot
    && isLootRevealSlots(record.lootReveal)
    && validBattleType
    && validRanking
  );
}

export { LOOT_REVEAL_SLOT_COUNT };

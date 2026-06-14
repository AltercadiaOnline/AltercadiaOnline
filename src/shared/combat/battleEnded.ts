import type { BattleLootPreview } from '../loot/lootTypes.js';
import { isLootRevealSlots, type LootRevealSlot } from '../loot/lootRevealSlots.js';
import type { BattleRankingResult, BattleType } from './battleType.js';
import { isBattleRankingResult, isBattleType } from './battleType.js';

/** Motivo autoritativo de encerramento — cliente usa só para feedback visual. */
export type BattleEndReason = 'VICTORY' | 'DEFEAT' | 'FORFEIT';

/** Payload autoritativo emitido pelo servidor ao encerrar uma batalha. */
export type BattleEndedPayload = {
  readonly battleId: string;
  readonly victory: boolean;
  readonly monsterInstanceId: string;
  /** @deprecated Use hasLoot + lootPreview */
  readonly lootGranted: boolean;
  readonly hasLoot?: boolean;
  readonly lootPreview?: BattleLootPreview;
  /** 4 slots autoritativos — espelho de COMBAT_FINISHED.lootReveal. */
  readonly lootReveal?: readonly LootRevealSlot[];
  readonly endReason?: BattleEndReason;
  readonly xpGain?: number;
  /** Volts debitados ao render-se (≤ BATTLE_SURRENDER_VOLT_PENALTY). */
  readonly surrenderVoltPenalty?: number;
  readonly battleType?: BattleType;
  readonly rankingResult?: BattleRankingResult;
};

export function isBattleEndedPayload(value: unknown): value is BattleEndedPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const endReason = record.endReason;
  const validReason = endReason === undefined
    || endReason === 'VICTORY'
    || endReason === 'DEFEAT'
    || endReason === 'FORFEIT';
  const lootPreview = record.lootPreview;
  const validPreview = lootPreview === undefined || (
    typeof lootPreview === 'object'
    && lootPreview !== null
    && typeof (lootPreview as Record<string, unknown>).lootId === 'string'
  );
  const lootReveal = record.lootReveal;
  const validReveal = lootReveal === undefined || isLootRevealSlots(lootReveal);
  const surrenderVoltPenalty = record.surrenderVoltPenalty;
  const validPenalty = surrenderVoltPenalty === undefined
    || (typeof surrenderVoltPenalty === 'number' && surrenderVoltPenalty >= 0);
  const battleType = record.battleType;
  const validBattleType = battleType === undefined || isBattleType(battleType);
  const rankingResult = record.rankingResult;
  const validRanking = rankingResult === undefined || isBattleRankingResult(rankingResult);
  return (
    typeof record.battleId === 'string'
    && typeof record.victory === 'boolean'
    && typeof record.monsterInstanceId === 'string'
    && typeof record.lootGranted === 'boolean'
    && validReason
    && validPreview
    && validReveal
    && validPenalty
    && validBattleType
    && validRanking
  );
}

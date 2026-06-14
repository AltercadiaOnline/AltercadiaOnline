import type { CombatFinishedPayload } from '../../shared/combat/combatFinished.js';
import type { BattleEndReason } from '../../shared/combat/battleEnded.js';
import { BattleType } from '../../shared/combat/battleType.js';
import { resolveDefeatedCreatureLevel } from '../../shared/combat/battleXpRewards.js';
import {
  resolveBattleProgressionGrant,
  type BattleProgressionGrantInput,
} from '../../shared/progression/battleProgressionGrant.js';
import { CombatEventType, type CombatFinishedEvent } from '../../shared/events.js';
import { buildEmptyLootRevealSlots } from '../../shared/loot/lootRevealSlots.js';
import type { LootRevealSlot } from '../../shared/loot/lootRevealSlots.js';
import type { BattleLootPreview } from '../../shared/loot/lootTypes.js';
import type { CombatState } from '../../shared/types.js';
import {
  didPlayerWinBattle,
  resolveBattleCreatureId,
} from '../../shared/items/combatCreatureRegistry.js';

export type BattleProgressionContext = Pick<
  BattleProgressionGrantInput,
  'characterLevel' | 'movesetMastery'
>;

/** @deprecated lootPreview/lootReveal ignorados — use BATTLE_LOOT_PACKAGE no hub. */
export function buildCombatFinishedEvent(
  state: CombatState,
  playerActorId: string,
  _lootPreview: BattleLootPreview | null = null,
  _lootReveal: readonly LootRevealSlot[] | null = null,
  endReason?: BattleEndReason,
  movesUsedInBattle: readonly string[] = [],
  progressionContext?: BattleProgressionContext,
): CombatFinishedEvent {
  const victory = didPlayerWinBattle(state, playerActorId);
  const creatureId = resolveBattleCreatureId(state.combatants, playerActorId);
  const defeatedLevel = creatureId ? resolveDefeatedCreatureLevel(creatureId) : 1;
  const battleType = state.battleType ?? BattleType.PVE;

  const progressionGrant = resolveBattleProgressionGrant(
    creatureId
      ? {
          victory,
          battleType,
          creatureId,
          defeatedLevel,
          movesUsedInBattle,
          ...(progressionContext ?? {}),
        }
      : {
          victory,
          battleType,
          defeatedLevel,
          movesUsedInBattle,
          ...(progressionContext ?? {}),
        },
  );

  const xpGain = progressionGrant.totalBattleXp;

  /** Loot pesado é enviado depois via BATTLE_LOOT_PACKAGE — evita travar o fim da luta. */
  const payload: CombatFinishedPayload = {
    battleId: state.battleId,
    victory,
    xpGain,
    loot: null,
    lootReveal: buildEmptyLootRevealSlots(),
    battleType,
    progressionGrant,
    ...(endReason !== undefined ? { endReason } : {}),
  };

  return { type: CombatEventType.COMBAT_FINISHED, payload };
}

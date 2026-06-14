import type { InventoryStack } from '../character/equipmentState.js';
import {
  PET_INHERITANCE_TOKENS,
  type PetInheritanceTokenId,
} from './petInheritance.js';

export type PetInheritanceBonuses = {
  readonly xpBonusPercent: number;
  readonly dropBonusPercent: number;
  readonly statsBonusPercent: number;
  readonly activeTokenIds: readonly PetInheritanceTokenId[];
};

export const EMPTY_PET_INHERITANCE_BONUSES: PetInheritanceBonuses = {
  xpBonusPercent: 0,
  dropBonusPercent: 0,
  statsBonusPercent: 0,
  activeTokenIds: [],
};

const TOKEN_IDS = Object.keys(PET_INHERITANCE_TOKENS) as PetInheritanceTokenId[];

function isInheritanceTokenId(itemId: string): itemId is PetInheritanceTokenId {
  return TOKEN_IDS.includes(itemId as PetInheritanceTokenId);
}

/** Tokens no inventário concedem bônus passivos — usa o maior valor por stat. */
export function resolvePetInheritanceBonusesFromItemIds(
  itemIds: readonly string[],
): PetInheritanceBonuses {
  const owned = new Set(
    itemIds.filter((itemId) => isInheritanceTokenId(itemId)),
  ) as Set<PetInheritanceTokenId>;

  if (owned.size === 0) return EMPTY_PET_INHERITANCE_BONUSES;

  let xpBonusPercent = 0;
  let dropBonusPercent = 0;
  let statsBonusPercent = 0;

  for (const tokenId of owned) {
    const def = PET_INHERITANCE_TOKENS[tokenId];
    xpBonusPercent = Math.max(xpBonusPercent, def.xpBonusPercent);
    dropBonusPercent = Math.max(dropBonusPercent, def.dropBonusPercent);
    statsBonusPercent = Math.max(statsBonusPercent, def.statsBonusPercent);
  }

  return {
    xpBonusPercent,
    dropBonusPercent,
    statsBonusPercent,
    activeTokenIds: [...owned],
  };
}

export function resolvePetInheritanceBonusesFromStacks(
  stacks: readonly InventoryStack[],
): PetInheritanceBonuses {
  const itemIds = stacks
    .filter((stack) => stack.quantity > 0)
    .flatMap((stack) => Array.from({ length: stack.quantity }, () => stack.itemId));
  return resolvePetInheritanceBonusesFromItemIds(itemIds);
}

export function scaleBattleProgressionXp<T extends { readonly levelXp: number; readonly movesetXpByMoveId: Readonly<Record<string, number>>; readonly totalBattleXp: number }>(
  grant: T,
  xpBonusPercent: number,
): T {
  if (xpBonusPercent <= 0) return grant;
  const mult = 1 + xpBonusPercent / 100;
  const movesetXpByMoveId: Record<string, number> = {};
  for (const [moveId, xp] of Object.entries(grant.movesetXpByMoveId)) {
    movesetXpByMoveId[moveId] = Math.floor(xp * mult);
  }
  const levelXp = Math.floor(grant.levelXp * mult);
  const moveTotal = Object.values(movesetXpByMoveId).reduce((sum, xp) => sum + xp, 0);
  return {
    ...grant,
    levelXp,
    movesetXpByMoveId,
    totalBattleXp: levelXp + moveTotal,
  };
}

export function applyInheritanceStatsBonusPercent(
  stats: import('../character/playerStatsBonus.js').PlayerStatsBonus,
  statsBonusPercent: number,
): import('../character/playerStatsBonus.js').PlayerStatsBonus {
  if (statsBonusPercent <= 0) return stats;
  const mult = 1 + statsBonusPercent / 100;
  return {
    defesa: Math.floor(stats.defesa * mult),
    esquiva: Math.floor(stats.esquiva * mult),
    vida: Math.floor(stats.vida * mult),
    agilidade: Math.floor(stats.agilidade * mult),
    critico: Math.floor(stats.critico * mult),
    forca: Math.floor(stats.forca * mult),
  };
}

import type { BattleLootBundle } from '../shared/loot/lootTypes.js';
import {
  generateBattleLoot,
  type BattleLootGeneration,
  type LootGeneratorOptions,
} from './LootGenerator.js';

export type LootRollOptions = {
  readonly defeatedLevel?: number;
  readonly lootBonusMultiplier?: number;
  readonly rng?: () => number;
};

/**
 * Motor de drop autoritativo — delega ao LootGenerator (4 slots hardcore).
 */
export class LootManager {
  generateBattleLoot(
    sourceId: string,
    winnerId: string,
    options: LootRollOptions = {},
  ): BattleLootGeneration | null {
    return generateBattleLoot({
      sourceId,
      winnerId,
      ...(options.defeatedLevel !== undefined ? { defeatedLevel: options.defeatedLevel } : {}),
      ...(options.lootBonusMultiplier !== undefined
        ? { lootBonusMultiplier: options.lootBonusMultiplier }
        : {}),
      ...(options.rng !== undefined ? { rng: options.rng } : {}),
    });
  }

  rollLoot(sourceId: string, winnerId: string, options: LootRollOptions = {}): BattleLootBundle | null {
    return this.generateBattleLoot(sourceId, winnerId, options)?.bundle ?? null;
  }
}

let singleton: LootManager | null = null;

export function getLootManager(): LootManager {
  if (!singleton) singleton = new LootManager();
  return singleton;
}

export type { LootGeneratorOptions, BattleLootGeneration };

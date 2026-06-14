import {
  getCreatureAssets,
  getCreatureBattleSpriteCandidates,
} from '../../loaders/CreatureAssetLoader.js';
import { getMonsterByCreatureId } from '../../../shared/combat/MonsterCatalog.js';
import { getMonsterRegistryEntry } from '../../../shared/world/monsterRegistry.js';

export type BattleSpriteCatalogEntry = {
  readonly monsterId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly spriteSrc: string;
  readonly attackSpriteSrc: string;
  readonly classId: string | null;
};

/** URL idle side-view resolvida via manifesto da zona. */
export function buildCreatureBattleSpriteSrc(creatureId: string): string {
  return getCreatureAssets(creatureId).sprites.idle;
}

export function buildCreatureAttackSpriteSrc(creatureId: string): string {
  return getCreatureAssets(creatureId).sprites.attack;
}

export function battleSpriteSrcCandidates(creatureId: string): readonly string[] {
  return getCreatureBattleSpriteCandidates(creatureId);
}

/** Resolve sprite do oponente a partir do monsterId do world registry. */
export function resolveBattleSpriteFromMonsterId(monsterId: string): BattleSpriteCatalogEntry | null {
  const entry = getMonsterRegistryEntry(monsterId);
  if (!entry) return null;

  const creature = getMonsterByCreatureId(entry.creatureId);
  const assets = getCreatureAssets(entry.creatureId);
  return {
    monsterId: entry.id,
    creatureId: entry.creatureId,
    name: entry.name,
    spriteSrc: assets.sprites.idle,
    attackSpriteSrc: assets.sprites.attack,
    classId: creature?.classId ?? null,
  };
}

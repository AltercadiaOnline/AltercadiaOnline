import { describe, expect, it } from 'vitest';
import { generateBattleLoot } from '../../Economy/LootGenerator.js';
import { CREATURE_DROP_TABLE, getCreatureDropEntry } from '../items/creatureDrops.js';
import { resolveCreatureLootConfig } from './creatureLootConfig.js';
import { resolveDropTable } from './dropTable.js';
import { resolveItemLootRarity } from './lootRarity.js';
import { LOOT_REVEAL_SLOT_COUNT } from './lootRevealSlots.js';
import {
  isVortexAgentLootSource,
  rollVortexAgentLootReveal,
  VORTEX_AGENT_FRAGMENT_ITEM_ID,
  VORTEX_AGENT_FRAGMENT_SLOT_CHANCE,
} from './vortexAgentLoot.js';

const ALWAYS_EMPTY_RNG = (): number => 0.99;
const ALWAYS_HIT_RNG = (): number => 0;

function sequentialRng(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? 1;
    index += 1;
    return value;
  };
}

function fragmentCount(slots: readonly { kind: string; itemId?: string }[]): number {
  return slots.filter(
    (slot) => slot.kind === 'ITEM' && slot.itemId === VORTEX_AGENT_FRAGMENT_ITEM_ID,
  ).length;
}

describe('soul_fragment exclusivo do Agente Vórtex', () => {
  it('só vortex_agent lista soul_fragment no pool genérico', () => {
    const withFragment = CREATURE_DROP_TABLE.filter((entry) =>
      entry.genericDropIds.includes('soul_fragment'),
    );
    expect(withFragment.map((entry) => entry.creatureId)).toEqual(['vortex_agent']);
  });

  it('catálogo do agente não usa item garantido nem equipável', () => {
    const config = resolveCreatureLootConfig('vortex_agent');
    expect(config).not.toBeNull();
    expect(config?.genericItems.map((item) => item.itemId)).toEqual(['soul_fragment']);
    expect(config?.equipableItemId).toBeNull();
    expect(config?.guaranteedItemIds).toEqual([]);
  });

  it('rato e demais criaturas não resolvem soul_fragment', () => {
    const rat = resolveCreatureLootConfig('rat');
    expect(rat?.genericItems.some((item) => item.itemId === 'soul_fragment')).toBe(false);
    expect(rat?.guaranteedItemIds ?? []).toEqual([]);
    expect(getCreatureDropEntry('rat')?.genericDropIds).toEqual(['bones']);

    const ratLoot = generateBattleLoot({
      sourceId: 'rat',
      winnerId: 'player-test',
      rng: ALWAYS_EMPTY_RNG,
    });
    expect(ratLoot?.bundle.items.some((item) => item.itemId === 'soul_fragment')).toBe(false);
  });

  it('duelo PvP não dropa soul_fragment', () => {
    expect(resolveDropTable('duel_level_1', 1)?.genericDropIds).toEqual([]);
  });
});

describe('loot exclusivo do Agente Vórtex (cassino próprio)', () => {
  it('só vortex_agent entra no gerador de fragmentos', () => {
    expect(isVortexAgentLootSource('vortex_agent')).toBe(true);
    expect(isVortexAgentLootSource('rat')).toBe(false);
    expect(isVortexAgentLootSource('hydra')).toBe(false);
    expect(isVortexAgentLootSource('minotaur')).toBe(false);
  });

  it('cassino vazio pode sair 0 fragmentos — sem ouro e sem garantia', () => {
    const generation = generateBattleLoot({
      sourceId: 'vortex_agent',
      winnerId: 'player-test',
      rng: ALWAYS_EMPTY_RNG,
    });
    expect(generation).not.toBeNull();
    expect(generation?.lootReveal).toHaveLength(LOOT_REVEAL_SLOT_COUNT);
    expect(generation?.lootReveal.every((slot) => slot.kind === 'EMPTY')).toBe(true);
    expect(generation?.bundle.items).toEqual([]);
    expect(generation?.bundle.voltReward).toBe(0);
  });

  it('pode preencher os 4 slots só com soul_fragment', () => {
    const generation = generateBattleLoot({
      sourceId: 'vortex_agent',
      winnerId: 'player-test',
      rng: ALWAYS_HIT_RNG,
    });
    expect(generation).not.toBeNull();
    expect(fragmentCount(generation?.lootReveal ?? [])).toBe(4);
    expect(generation?.lootReveal.every((slot) => slot.kind === 'ITEM' && slot.itemId === 'soul_fragment')).toBe(true);
    expect(generation?.bundle.items).toEqual([
      {
        itemId: 'soul_fragment',
        quantity: 4,
        rarity: resolveItemLootRarity('soul_fragment'),
      },
    ]);
    expect(generation?.bundle.voltReward).toBe(0);
  });

  it('slots independentes: 0 a 4 fragmentos numa luta, só fragmento', () => {
    const miss = VORTEX_AGENT_FRAGMENT_SLOT_CHANCE;
    const hit = 0;
    const rolls = [hit, miss, hit, miss];
    const slots = rollVortexAgentLootReveal(sequentialRng(rolls));
    expect(fragmentCount(slots)).toBe(2);
    expect(slots.map((slot) => slot.kind)).toEqual(['ITEM', 'EMPTY', 'ITEM', 'EMPTY']);
    expect(slots.filter((slot) => slot.kind === 'ITEM').every((slot) => slot.itemId === 'soul_fragment')).toBe(true);
    expect(slots.some((slot) => slot.kind === 'GOLD')).toBe(false);
  });

  it('hidra e rato não usam o gerador do agente mesmo com RNG de acerto', () => {
    const hydra = generateBattleLoot({
      sourceId: 'hydra',
      winnerId: 'player-test',
      rng: ALWAYS_HIT_RNG,
    });
    expect(hydra?.lootReveal.some((slot) => slot.itemId === 'soul_fragment')).toBe(false);

    const rat = generateBattleLoot({
      sourceId: 'rat',
      winnerId: 'player-test',
      rng: ALWAYS_HIT_RNG,
    });
    expect(rat?.lootReveal.some((slot) => slot.itemId === 'soul_fragment')).toBe(false);
  });
});

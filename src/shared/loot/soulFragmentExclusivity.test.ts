import { describe, expect, it } from 'vitest';
import { generateBattleLoot } from '../../Economy/LootGenerator.js';
import { CREATURE_DROP_TABLE, getCreatureDropEntry } from '../items/creatureDrops.js';
import { resolveCreatureLootConfig } from './creatureLootConfig.js';
import { resolveDropTable } from './dropTable.js';

const ALWAYS_EMPTY_RNG = (): number => 0.99;

describe('soul_fragment exclusivo do Agente Vórtex', () => {
  it('só vortex_agent lista soul_fragment no pool genérico', () => {
    const withFragment = CREATURE_DROP_TABLE.filter((entry) =>
      entry.genericDropIds.includes('soul_fragment'),
    );
    expect(withFragment.map((entry) => entry.creatureId)).toEqual(['vortex_agent']);
  });

  it('drop do agente é padrão: só fragmento, garantido, sem peso especial', () => {
    const config = resolveCreatureLootConfig('vortex_agent');
    expect(config).not.toBeNull();
    expect(config?.genericItems.map((item) => item.itemId)).toEqual(['soul_fragment']);
    expect(config?.genericItems[0]?.weight).toBe(3);
    expect(config?.equipableItemId).toBeNull();
    expect(config?.guaranteedItemIds).toEqual(['soul_fragment']);
  });

  it('vitória contra o agente sempre dropa soul_fragment, mesmo com cassino vazio', () => {
    const generation = generateBattleLoot({
      sourceId: 'vortex_agent',
      winnerId: 'player-test',
      rng: ALWAYS_EMPTY_RNG,
    });
    expect(generation).not.toBeNull();
    expect(generation?.bundle.items.some((item) => item.itemId === 'soul_fragment')).toBe(true);
    expect(generation?.lootReveal.some((slot) => slot.kind === 'ITEM' && slot.itemId === 'soul_fragment')).toBe(true);
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

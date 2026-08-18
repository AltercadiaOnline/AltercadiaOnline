import { describe, expect, it } from 'vitest';
import { CREATURE_DROP_TABLE, getCreatureDropEntry } from '../items/creatureDrops.js';
import { resolveCreatureLootConfig } from './creatureLootConfig.js';
import { resolveDropTable } from './dropTable.js';

describe('soul_fragment exclusivo do Agente Vórtex', () => {
  it('só vortex_agent lista soul_fragment no pool genérico', () => {
    const withFragment = CREATURE_DROP_TABLE.filter((entry) =>
      entry.genericDropIds.includes('soul_fragment'),
    );
    expect(withFragment.map((entry) => entry.creatureId)).toEqual(['vortex_agent']);
  });

  it('drop do agente é padrão: só fragmento, sem peso especial', () => {
    const config = resolveCreatureLootConfig('vortex_agent');
    expect(config).not.toBeNull();
    expect(config?.genericItems.map((item) => item.itemId)).toEqual(['soul_fragment']);
    expect(config?.genericItems[0]?.weight).toBe(3);
    expect(config?.equipableItemId).toBeNull();
  });

  it('rato e demais criaturas não resolvem soul_fragment', () => {
    const rat = resolveCreatureLootConfig('rat');
    expect(rat?.genericItems.some((item) => item.itemId === 'soul_fragment')).toBe(false);
    expect(getCreatureDropEntry('rat')?.genericDropIds).toEqual(['bones']);
  });

  it('duelo PvP não dropa soul_fragment', () => {
    expect(resolveDropTable('duel_level_1', 1)?.genericDropIds).toEqual([]);
  });
});

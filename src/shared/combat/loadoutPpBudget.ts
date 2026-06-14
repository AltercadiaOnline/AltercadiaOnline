import { ACTIVE_MOVESET_SLOT_COUNT } from './moveTypes.js';
import { resolveMoveDefinitionForUi } from './movesetLoadout.js';

export type LoadoutPpBudget = {
  readonly ppCurrent: number;
  readonly ppMax: number;
};

/** PP base de um movimento (catálogo de classe / monstro). */
export function resolveMoveBasePp(moveId: string): number {
  const meta = resolveMoveDefinitionForUi(moveId);
  if (!meta) return 0;
  const pp = meta.ppMax;
  if (pp === undefined || pp <= 0) return 0;
  return Math.floor(pp);
}

/**
 * Orçamento de PP do loadout ativo — soma do `basePp` de cada slot (até 4).
 * No mundo, `ppCurrent` espelha o pool cheio; combate debita por skill.
 */
export function resolveLoadoutPpBudget(loadout: readonly string[]): LoadoutPpBudget {
  const slots = loadout.slice(0, ACTIVE_MOVESET_SLOT_COUNT);
  let ppMax = 0;
  for (const moveId of slots) {
    ppMax += resolveMoveBasePp(moveId);
  }
  return { ppCurrent: ppMax, ppMax };
}

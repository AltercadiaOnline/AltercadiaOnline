/**
 * Mapeia IDs de combate (actorId) para IDs do catálogo de drops v1.0.
 * Combat não importa Economy — apenas expõe o creatureId para o gateway.
 */
export {
  COMBAT_ACTOR_TO_CREATURE,
  resolveCreatureIdFromActorId,
} from '../combat/MonsterCatalog.js';

import { resolveCreatureIdFromActorId } from '../combat/MonsterCatalog.js';
import { battleUsesPetTurnQueue } from '../combat/petTurnOrder.js';
import { didPlayerWinBattle } from '../combat/battleResolution.js';
import { getCombatRole } from '../pet/petCombatRules.js';
import type { Combatant } from '../types.js';

export { resolveCombatantHp } from '../pet/petCombatRules.js';
export { didPlayerWinBattle };

export function resolveCreatureIdFromCombatActor(actorId: string): string | null {
  return resolveCreatureIdFromActorId(actorId);
}

/** Primeiro inimigo com mapeamento de drop na batalha. */
export function resolveBattleCreatureId(
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string,
): string | null {
  if (battleUsesPetTurnQueue(combatants)) {
    for (const [id, combatant] of Object.entries(combatants)) {
      if (getCombatRole(combatant) !== 'ENEMY') continue;
      const creatureId = resolveCreatureIdFromCombatActor(id);
      if (creatureId) return creatureId;
    }
    return null;
  }

  for (const [id] of Object.entries(combatants)) {
    if (id === playerActorId) continue;
    const creatureId = resolveCreatureIdFromCombatActor(id);
    if (creatureId) return creatureId;
  }
  return null;
}


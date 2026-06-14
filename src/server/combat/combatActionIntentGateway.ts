import { getCharacterProfile } from '../../Economy/economyStore.js';
import { resolvePlayerEquippedSkillIds } from '../../shared/combat/movesetLoadout.js';
import { sanitizeCombatActionIntent } from '../../shared/combat/combatActionIntent.js';
import type { ActionRequest } from '../../shared/events.js';
import { getConsumableDefinition } from '../../shared/items/consumablesCatalog.js';
import { ConsumableUsage } from '../../shared/items/itemTypes.js';
import type { CombatState } from '../../shared/types.js';
import { resolveAuthoritativeCombatLoadout } from '../persistence/authoritativeCombatLoadout.js';

export { sanitizeCombatActionIntent } from '../../shared/combat/combatActionIntent.js';

export type CombatIntentValidationReason =
  | 'INVALID_SKILL'
  | 'INVALID_CONSUMABLE'
  | 'INVALID_BATTLE'
  | 'NOT_YOUR_ACTOR';

/**
 * Valida intenção de combate contra persistence + snapshot da sessão.
 * Consulta economyStore / loadout autoritativo antes de liberar o motor.
 */
export function validateCombatActionAgainstPersistence(
  playerId: string,
  characterId: number,
  action: ActionRequest,
  state: CombatState,
  playerActorId: string,
): { readonly ok: true } | { readonly ok: false; readonly reason: CombatIntentValidationReason } {
  if (action.actorId !== playerActorId) {
    return { ok: false, reason: 'NOT_YOUR_ACTOR' };
  }
  if (action.battleId !== state.battleId) {
    return { ok: false, reason: 'INVALID_BATTLE' };
  }

  if (action.skillId) {
    const actor = state.combatants[playerActorId];
    if (!actor?.skills.some((skill) => skill.id === action.skillId)) {
      return { ok: false, reason: 'INVALID_SKILL' };
    }

    const loadout = resolveAuthoritativeCombatLoadout(playerId, characterId);
    const authorizedMoveIds = resolvePlayerEquippedSkillIds(
      loadout.classId,
      loadout.equippedSkillIds,
    );
    if (!authorizedMoveIds.includes(action.skillId)) {
      return { ok: false, reason: 'INVALID_SKILL' };
    }
  }

  if (action.consumableId) {
    const def = getConsumableDefinition(action.consumableId);
    if (!def || def.usage !== ConsumableUsage.InCombat) {
      return { ok: false, reason: 'INVALID_CONSUMABLE' };
    }

    const profile = getCharacterProfile(playerId, characterId);
    const stack = profile.inventory.find((row) => row.itemId === action.consumableId);
    if (!stack || stack.quantity < 1) {
      return { ok: false, reason: 'INVALID_CONSUMABLE' };
    }
  }

  return { ok: true };
}

/** Sanitiza payload bruto do WS antes da validação de sessão. */
export function parseCombatActionIntent(value: unknown): ActionRequest | null {
  return sanitizeCombatActionIntent(value);
}

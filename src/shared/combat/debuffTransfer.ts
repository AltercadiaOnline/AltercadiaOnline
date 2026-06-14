import type { Combatant, RuntimeModifier, RuntimeStatus } from '../types/combat.js';
import { RuntimeModifierKind } from '../types/combat.js';
import {
  DEBUFF_RUNTIME_STATUS_IDS,
  hasActiveRuntimeStatus,
} from './runtimeStatusCatalog.js';
import { isRuntimeModifierActive } from './runtimeActorTiming.js';

export type TransferableDebuff =
  | { readonly kind: 'status'; readonly status: RuntimeStatus }
  | { readonly kind: 'weaken'; readonly modifier: RuntimeModifier };

/** Primeiro debuff removível do portador — status CC/DoT ou weaken temporário. */
export function findFirstTransferableDebuff(
  combatant: Combatant,
  currentTurn: number,
): TransferableDebuff | null {
  const statuses = combatant.activeStatuses ?? [];
  for (const statusId of DEBUFF_RUNTIME_STATUS_IDS) {
    const row = statuses.find((entry) => entry.id === statusId);
    if (row && hasActiveRuntimeStatus(statuses, statusId, currentTurn)) {
      return { kind: 'status', status: row };
    }
  }

  const weaken = (combatant.temporaryModifiers ?? []).find(
    (mod) => mod.kind === RuntimeModifierKind.BuffWeaken
      && mod.percent > 0
      && isRuntimeModifierActive(currentTurn, mod),
  );
  if (weaken) {
    return { kind: 'weaken', modifier: weaken };
  }

  return null;
}

export function cloneTransferredStatus(
  status: RuntimeStatus,
  appliedAtTurn: number,
  sourceActorId: string,
  sourceSkillId: string,
): RuntimeStatus {
  return {
    ...status,
    appliedAtTurn,
    sourceActorId,
    sourceSkillId,
    ...(status.metadata ? { metadata: { ...status.metadata } } : {}),
  };
}

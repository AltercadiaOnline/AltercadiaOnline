import {
  RuntimeModifierKind,
  RuntimeShieldId,
  RuntimeStatusId,
  type RuntimeModifier,
  type RuntimeStatus,
} from '../types/combat.js';
import {
  computeRuntimeTurnsRemaining,
  isRuntimeEffectActive,
  isRuntimeModifierActive,
  isRuntimePermanentDuration,
  resolveRuntimeAppliedAtTurn,
  RUNTIME_PERMANENT_DURATION,
} from './runtimeActorTiming.js';

export { RUNTIME_PERMANENT_DURATION };

/** Debuffs que contam para DebuffScalingDamage e similar. */
export const DEBUFF_RUNTIME_STATUS_IDS: ReadonlySet<string> = new Set([
  RuntimeStatusId.Burn,
  RuntimeStatusId.Paralyze,
  RuntimeStatusId.Confuse,
  RuntimeStatusId.DelayedDetonation,
  RuntimeStatusId.MovesetWeaken,
  RuntimeStatusId.LockEnemyMoves,
  RuntimeStatusId.Vulnerable,
]);

/** CC bloqueado por MARCO_CC_IMMUNE além de debuffs gerais. */
export const CC_RUNTIME_STATUS_IDS: ReadonlySet<string> = new Set([
  RuntimeStatusId.Paralyze,
  RuntimeStatusId.Confuse,
  RuntimeStatusId.LockEnemyMoves,
]);

export function isIncomingStatusBlocked(
  target: { readonly activeStatuses?: readonly RuntimeStatus[] },
  statusId: string,
  currentTurn = Number.MAX_SAFE_INTEGER,
): boolean {
  const statuses = target.activeStatuses ?? [];
  if (
    DEBUFF_RUNTIME_STATUS_IDS.has(statusId)
    && hasActiveRuntimeStatus(statuses, RuntimeStatusId.StatusImmunity, currentTurn)
  ) {
    return true;
  }
  if (
    CC_RUNTIME_STATUS_IDS.has(statusId)
    && hasActiveRuntimeStatus(statuses, RuntimeStatusId.MarcoCcImmune, currentTurn)
  ) {
    return true;
  }
  return false;
}

export function hasActiveRuntimeStatus(
  statuses: readonly RuntimeStatus[],
  statusId: string,
  currentTurn = Number.MAX_SAFE_INTEGER,
): boolean {
  return statuses.some((row) => {
    if (row.id !== statusId) return false;
    if (currentTurn === Number.MAX_SAFE_INTEGER) {
      return row.turnsRemaining > 0;
    }
    const appliedAtTurn = resolveRuntimeAppliedAtTurn(row);
    return isRuntimeEffectActive(currentTurn, appliedAtTurn, row.turnsRemaining, row.id);
  });
}

/** VULNERABLE: alvo recebe +20% de dano na fórmula central. */
export function vulnerableDamageMultiplierFromStatuses(
  statuses: readonly RuntimeStatus[],
  currentTurn = Number.MAX_SAFE_INTEGER,
): number {
  return hasActiveRuntimeStatus(statuses, RuntimeStatusId.Vulnerable, currentTurn) ? 1.2 : 1;
}

export function countRuntimeDebuffs(
  combatant: {
    readonly activeStatuses?: readonly RuntimeStatus[];
    readonly temporaryModifiers?: readonly RuntimeModifier[];
  },
  currentTurn = Number.MAX_SAFE_INTEGER,
): number {
  const statuses = combatant.activeStatuses ?? [];
  let count = statuses.filter((row) => (
    DEBUFF_RUNTIME_STATUS_IDS.has(row.id)
    && hasActiveRuntimeStatus(statuses, row.id, currentTurn)
  )).length;
  const weakenMods = (combatant.temporaryModifiers ?? []).filter(
    (mod) => mod.kind === RuntimeModifierKind.BuffWeaken
      && mod.percent > 0
      && isRuntimeModifierActive(currentTurn, mod),
  );
  if (weakenMods.length > 0) count += 1;
  return count;
}

export function resolveModifierPercentFromCombatant(
  combatant: { readonly temporaryModifiers?: readonly RuntimeModifier[] },
  kind: RuntimeModifierKind,
  currentTurn = Number.MAX_SAFE_INTEGER,
): number {
  return (combatant.temporaryModifiers ?? [])
    .filter((entry) => (
      entry.kind === kind
      && entry.percent > 0
      && isRuntimeModifierActive(currentTurn, entry)
    ))
    .reduce((sum, entry) => sum + entry.percent, 0);
}

export function formatRuntimeStatusDisplayTurns(
  status: RuntimeStatus,
  currentTurn: number,
): number {
  return computeRuntimeTurnsRemaining(
    currentTurn,
    resolveRuntimeAppliedAtTurn(status),
    status.turnsRemaining,
    status.id,
  );
}

export function buildRuntimeModifier(
  kind: RuntimeModifierKind,
  percent: number,
  duration: number,
  appliedAtTurn: number,
): RuntimeModifier {
  return { kind, percent, turnsRemaining: duration, appliedAtTurn };
}

export function buildRuntimeStatus(
  id: RuntimeStatusId | string,
  name: string,
  duration: number,
  appliedAtTurn: number,
  options?: {
    readonly stacks?: number;
    readonly sourceActorId?: string;
    readonly sourceSkillId?: string;
    readonly metadata?: Readonly<Record<string, number>>;
  },
): RuntimeStatus {
  return {
    id,
    name,
    turnsRemaining: duration,
    appliedAtTurn,
    stacks: options?.stacks ?? 1,
    ...(options?.sourceActorId ? { sourceActorId: options.sourceActorId } : {}),
    ...(options?.sourceSkillId ? { sourceSkillId: options.sourceSkillId } : {}),
    ...(options?.metadata ? { metadata: options.metadata } : {}),
  };
}

export function buildSelfShield(
  value: number,
  duration: number,
  appliedAtTurn: number,
  name = 'Escudo',
): { readonly id: string; readonly name: string; readonly value: number; readonly turnsRemaining: number; readonly appliedAtTurn: number } {
  return {
    id: RuntimeShieldId.SelfShield,
    name,
    value,
    turnsRemaining: duration,
    appliedAtTurn,
  };
}

export function buildGroupShield(
  value: number,
  duration: number,
  appliedAtTurn: number,
  name = 'Barreira de Grupo',
): { readonly id: string; readonly name: string; readonly value: number; readonly turnsRemaining: number; readonly appliedAtTurn: number } {
  return {
    id: RuntimeShieldId.GroupShield,
    name,
    value,
    turnsRemaining: duration,
    appliedAtTurn,
  };
}

export function isPermanentRuntimeStatus(status: RuntimeStatus): boolean {
  return isRuntimePermanentDuration(status.turnsRemaining)
    || status.id === RuntimeStatusId.RetaliationCharge;
}

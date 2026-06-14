import { RuntimeStatusId } from '../types/combat.js';

/** Duração usada para efeitos que persistem até o fim da batalha. */
export const RUNTIME_PERMANENT_DURATION = 999;

const TICK_ON_ACTOR_TURN_STATUS_IDS: ReadonlySet<string> = new Set([
  RuntimeStatusId.Burn,
  RuntimeStatusId.Confuse,
  RuntimeStatusId.HealEcho,
]);

/** CC no portador — duração cobre a próxima ação dele mesmo se o turno global avançou. */
const BEARER_ACTION_WINDOW_STATUS_IDS: ReadonlySet<string> = new Set([
  RuntimeStatusId.Paralyze,
  RuntimeStatusId.LockEnemyMoves,
  RuntimeStatusId.Confuse,
  RuntimeStatusId.Thorns,
  RuntimeStatusId.DelayedDetonation,
]);

export type RuntimeTimedEntry = {
  readonly turnsRemaining: number;
  readonly appliedAtTurn?: number;
};

export function resolveRuntimeAppliedAtTurn(entry: RuntimeTimedEntry): number {
  return entry.appliedAtTurn ?? 0;
}

export function isRuntimePermanentDuration(duration: number): boolean {
  return duration >= RUNTIME_PERMANENT_DURATION;
}

export function isTickOnActorTurnStatus(statusId: string): boolean {
  return TICK_ON_ACTOR_TURN_STATUS_IDS.has(statusId);
}

/** Efeito expirou no início do turno atual do portador. */
export function isRuntimeEffectExpired(
  currentTurn: number,
  appliedAtTurn: number,
  duration: number,
  statusId?: string,
): boolean {
  if (isRuntimePermanentDuration(duration)) return false;
  if (statusId && isTickOnActorTurnStatus(statusId)) {
    return currentTurn > appliedAtTurn + duration;
  }
  if (statusId && BEARER_ACTION_WINDOW_STATUS_IDS.has(statusId)) {
    return currentTurn >= appliedAtTurn + duration;
  }
  return currentTurn >= appliedAtTurn + duration;
}

export function isRuntimeEffectActive(
  currentTurn: number,
  appliedAtTurn: number,
  duration: number,
  statusId?: string,
): boolean {
  return !isRuntimeEffectExpired(currentTurn, appliedAtTurn, duration, statusId);
}

/** Turnos restantes para HUD (aproximação até expirar). */
export function computeRuntimeTurnsRemaining(
  currentTurn: number,
  appliedAtTurn: number,
  duration: number,
  statusId?: string,
): number {
  if (isRuntimePermanentDuration(duration)) return duration;
  if (statusId && isTickOnActorTurnStatus(statusId)) {
    return Math.max(0, appliedAtTurn + duration - currentTurn + 1);
  }
  return Math.max(0, appliedAtTurn + duration - currentTurn);
}

/** DoT / eco / residual — tick no início do turno do portador, nunca no turno da aplicação. */
export function shouldTickOnActorTurnStart(
  currentTurn: number,
  appliedAtTurn: number,
  duration: number,
  statusId: string,
): boolean {
  if (!isTickOnActorTurnStatus(statusId)) return false;
  if (currentTurn <= appliedAtTurn) return false;
  return currentTurn <= appliedAtTurn + duration;
}

/** Detonação atrasada — no início do turno quando a janela fecha. */
export function shouldDetonateDelayedOnActorTurnStart(
  currentTurn: number,
  appliedAtTurn: number,
  duration: number,
): boolean {
  return currentTurn >= appliedAtTurn + duration;
}

export function isRuntimeModifierActive(
  currentTurn: number,
  modifier: RuntimeTimedEntry,
): boolean {
  if (currentTurn === Number.MAX_SAFE_INTEGER) {
    return modifier.turnsRemaining > 0;
  }
  const appliedAtTurn = resolveRuntimeAppliedAtTurn(modifier);
  return isRuntimeEffectActive(currentTurn, appliedAtTurn, modifier.turnsRemaining);
}

export function isRuntimeShieldActive(
  currentTurn: number,
  shield: RuntimeTimedEntry,
): boolean {
  if (currentTurn === Number.MAX_SAFE_INTEGER) {
    return shield.turnsRemaining > 0;
  }
  const appliedAtTurn = resolveRuntimeAppliedAtTurn(shield);
  return isRuntimeEffectActive(currentTurn, appliedAtTurn, shield.turnsRemaining);
}

import { buildCombatVisualFeedback } from './combatVisualFeedback.js';
import { extractCombatActionIntentResult } from './combatIntentFeedback.js';
import { buildCombatUiHints, type CombatDispatchPayload } from '../combatWire.js';
import { CombatEventType, type CombatEvent } from '../events.js';
import type { CombatState, Combatant } from '../types.js';
import { listEnemyActorIds } from './petTurnOrder.js';

export type StaggeredCombatDispatch = {
  readonly playerPhase: CombatDispatchPayload;
  readonly monsterPhase: CombatDispatchPayload;
};

function isCombatVisualEvent(event: CombatEvent): boolean {
  return event.type === CombatEventType.SKILL_USED
    || event.type === CombatEventType.DAMAGE_DEALT
    || event.type === CombatEventType.HEAL_APPLIED
    || event.type === CombatEventType.SHIELD_APPLIED
    || event.type === CombatEventType.CONSUMABLE_USED;
}

function applyHpSnapshot(
  combatants: Record<string, Combatant>,
  event: CombatEvent,
): void {
  if (event.type === CombatEventType.DAMAGE_DEALT) {
    const target = combatants[event.payload.targetId];
    if (!target) return;
    combatants[event.payload.targetId] = {
      ...target,
      hp: event.payload.hpAfter,
      hpCurrent: event.payload.hpAfter,
    };
    return;
  }

  if (event.type === CombatEventType.HEAL_APPLIED) {
    const target = combatants[event.payload.targetId];
    if (!target) return;
    combatants[event.payload.targetId] = {
      ...target,
      hp: event.payload.hpAfter,
      hpCurrent: event.payload.hpAfter,
    };
  }
}

function cloneCombatants(state: CombatState): Record<string, Combatant> {
  const next: Record<string, Combatant> = {};
  for (const [id, combatant] of Object.entries(state.combatants)) {
    next[id] = { ...combatant };
  }
  return next;
}

function buildIntermediateState(
  finalState: CombatState,
  events: readonly CombatEvent[],
  playerActorId: string,
): CombatState {
  const combatants = cloneCombatants(finalState);
  for (const event of events) {
    applyHpSnapshot(combatants, event);
  }

  return {
    ...finalState,
    phase: 'RESOLVING',
    activeActorId: playerActorId,
    combatants,
  };
}

function isEnemyActor(
  actorId: string,
  enemyIds: ReadonlySet<string>,
): boolean {
  return enemyIds.has(actorId);
}

/**
 * Localiza o primeiro evento de contra-ataque inimigo após dano do jogador.
 * Retorna null quando não há reação (ex.: vitória imediata).
 */
export function findMonsterReactionSplitIndex(
  events: readonly CombatEvent[],
  playerActorId: string,
  enemyIds: readonly string[],
): number | null {
  const enemySet = new Set(enemyIds);
  let sawPlayerDamage = false;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!event) continue;

    if (
      event.type === CombatEventType.DAMAGE_DEALT
      && event.payload.sourceId === playerActorId
      && event.payload.amount > 0
    ) {
      sawPlayerDamage = true;
      continue;
    }

    if (!sawPlayerDamage) continue;

    if (event.type === CombatEventType.SKILL_USED && isEnemyActor(event.payload.actorId, enemySet)) {
      return index;
    }

    if (
      event.type === CombatEventType.DAMAGE_DEALT
      && isEnemyActor(event.payload.sourceId, enemySet)
    ) {
      return index;
    }
  }

  return null;
}

function slicePayload(
  source: CombatDispatchPayload,
  events: readonly CombatEvent[],
  state: CombatState,
  playerActorId: string,
): CombatDispatchPayload {
  const enemyActorIds = listEnemyActorIds(state.combatants, playerActorId);
  const feedback = buildCombatVisualFeedback(events, { playerActorId, enemyActorIds });
  const actionResult = extractCombatActionIntentResult(events);
  const { balanceVersion } = source;
  return {
    events,
    state,
    ui: buildCombatUiHints(state, playerActorId),
    feedback,
    ...(balanceVersion !== undefined ? { balanceVersion } : {}),
    ...(actionResult ? { actionResult } : {}),
  };
}

/** Indica se o pacote contém contra-ataque inimigo após dano do jogador. */
export function shouldStaggerMonsterReaction(
  payload: CombatDispatchPayload,
): boolean {
  const playerActorId = payload.ui.playerActorId;
  const enemyIds = listEnemyActorIds(payload.state.combatants, playerActorId);
  if (enemyIds.length === 0) return false;
  return findMonsterReactionSplitIndex(payload.events, playerActorId, enemyIds) !== null;
}

/**
 * Divide um dispatch PvE em duas entregas: jogador → (delay) → monstro.
 * O motor resolve o turno atomicamente; apenas a entrega ao cliente é escalonada.
 */
export function splitDispatchForMonsterStagger(
  payload: CombatDispatchPayload,
): StaggeredCombatDispatch | null {
  const playerActorId = payload.ui.playerActorId;
  const enemyIds = listEnemyActorIds(payload.state.combatants, playerActorId);
  const splitIndex = findMonsterReactionSplitIndex(payload.events, playerActorId, enemyIds);
  if (splitIndex === null) return null;

  const playerEvents = payload.events.slice(0, splitIndex);
  const monsterEvents = payload.events.slice(splitIndex);

  if (!monsterEvents.some(isCombatVisualEvent)) {
    return null;
  }

  const playerState = buildIntermediateState(payload.state, playerEvents, playerActorId);

  return {
    playerPhase: slicePayload(payload, playerEvents, playerState, playerActorId),
    monsterPhase: slicePayload(payload, monsterEvents, payload.state, playerActorId),
  };
}

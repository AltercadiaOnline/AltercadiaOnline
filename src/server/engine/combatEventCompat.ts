import { CombatEventType, type CombatEvent, type TurnUpdate } from '../../shared/events.js';

/** Eventos do protocolo da camada de cliente (HUD / Dashboard). */
export const CLIENT_CORE_EVENT_TYPES = new Set<string>([
  CombatEventType.BATTLE_START,
  CombatEventType.TURN_START,
  CombatEventType.DAMAGE_DEALT,
  CombatEventType.ACTION_ACCEPTED,
  CombatEventType.ACTION_REJECTED,
  CombatEventType.SKILL_CATALOG,
  CombatEventType.COMBAT_LOG,
  CombatEventType.BATTLE_STATE_UPDATE,
]);

/** Eventos estendidos V1.2 (observabilidade e mecânicas avançadas). */
export const CLIENT_EXTENDED_EVENT_TYPES = new Set<string>([
  CombatEventType.TURN_ORDER_RESOLVED,
  CombatEventType.CONSUMABLE_USED,
  CombatEventType.EXHAUSTION_APPLIED,
  CombatEventType.ELASTICITY_APPLIED,
  CombatEventType.HEALING_DECAY_APPLIED,
  CombatEventType.SUDDEN_DEATH_SCALING_APPLIED,
  CombatEventType.COMBAT_FINISHED,
]);

function toBattleStateUpdate(turn: TurnUpdate): CombatEvent {
  return {
    type: CombatEventType.BATTLE_STATE_UPDATE,
    payload: turn,
  };
}

/** Catálogo de skills do ator ativo — sincroniza paleta da HUD na fase CHOOSING. */
export function skillCatalogFromTurn(turn: TurnUpdate): CombatEvent | null {
  if (turn.phase !== 'CHOOSING' || !turn.activeActorId) return null;
  const actor = turn.combatants[turn.activeActorId];
  if (!actor?.skills?.length) return null;
  return {
    type: CombatEventType.SKILL_CATALOG,
    payload: { actorId: turn.activeActorId, skills: actor.skills },
  };
}

/**
 * Normaliza saída para o protocolo do cliente:
 * - Emite todos os eventos V1.2.
 * - Espelha TURN_START em BATTLE_STATE_UPDATE (HUD).
 * - Injeta SKILL_CATALOG na fase CHOOSING.
 */
export function mapEventsForClient(events: readonly CombatEvent[]): CombatEvent[] {
  const out: CombatEvent[] = [];
  for (const event of events) {
    out.push(event);
    if (event.type === CombatEventType.TURN_START) {
      out.push(toBattleStateUpdate(event.payload));
      const catalog = skillCatalogFromTurn(event.payload);
      if (catalog) out.push(catalog);
    }
  }
  return out;
}

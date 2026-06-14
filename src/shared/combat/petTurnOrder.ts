import type { ActionRequest } from '../events.js';
import type { Combatant } from '../types.js';
import {
  getCombatRole,
  isPetCombatantActive,
  resolveCombatantHp,
} from '../pet/petCombatRules.js';

/**
 * Ordenação de lote PvE com pet: [Jogador] → [Pets ativos no lote] → [Inimigos…].
 * Pet coadjuvante: só entra no lote quando CombatSession dispara a fase de assistência.
 */
export function battleUsesPetTurnQueue(combatants: Readonly<Record<string, Combatant>>): boolean {
  return Object.values(combatants).some((c) => getCombatRole(c) === 'PET');
}

export function listPetActorIds(
  combatants: Readonly<Record<string, Combatant>>,
  ownerPlayerId: string,
): readonly string[] {
  return Object.entries(combatants)
    .filter(([, c]) => getCombatRole(c) === 'PET' && c.ownerPlayerId === ownerPlayerId)
    .map(([id]) => id);
}

export function listActivePetActorIds(
  combatants: Readonly<Record<string, Combatant>>,
  ownerPlayerId: string,
): readonly string[] {
  return listPetActorIds(combatants, ownerPlayerId).filter((id) => {
    const combatant = combatants[id];
    return combatant ? isPetCombatantActive(combatant) : false;
  });
}

export function listEnemyActorIds(
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string,
): readonly string[] {
  if (battleUsesPetTurnQueue(combatants)) {
    return Object.entries(combatants)
      .filter(([, c]) => getCombatRole(c) === 'ENEMY')
      .map(([id]) => id);
  }
  return Object.keys(combatants).filter((id) => id !== playerActorId);
}

export function orderPetTurnQueue(
  requests: readonly ActionRequest[],
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string,
): readonly ActionRequest[] {
  const byActor = new Map<string, ActionRequest>();
  for (const request of requests) {
    byActor.set(request.actorId, request);
  }

  const ordered: ActionRequest[] = [];
  const placed = new Set<string>();

  const playerRequest = byActor.get(playerActorId);
  if (playerRequest) {
    ordered.push(playerRequest);
    placed.add(playerActorId);
  }

  for (const petId of listPetActorIds(combatants, playerActorId)) {
    const combatant = combatants[petId];
    if (!combatant || !isPetCombatantActive(combatant)) continue;
    const request = byActor.get(petId);
    if (request) {
      ordered.push(request);
      placed.add(petId);
    }
  }

  for (const enemyId of listEnemyActorIds(combatants, playerActorId)) {
    const request = byActor.get(enemyId);
    if (request) {
      ordered.push(request);
      placed.add(enemyId);
    }
  }

  for (const request of requests) {
    if (!placed.has(request.actorId)) {
      ordered.push(request);
      placed.add(request.actorId);
    }
  }

  return ordered;
}

export function resolveAttackTargetId(
  actorId: string,
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string,
): string | null {
  const actor = combatants[actorId];
  if (!actor) return null;

  const role = getCombatRole(actor);

  if (role === 'PLAYER' || role === 'PET') {
    for (const [id, combatant] of Object.entries(combatants)) {
      if (getCombatRole(combatant) !== 'ENEMY') continue;
      if (resolveCombatantHp(combatant) > 0) return id;
    }
    return null;
  }

  if (role === 'ENEMY') {
    const player = combatants[playerActorId];
    if (player && resolveCombatantHp(player) > 0) return playerActorId;

    for (const [id, combatant] of Object.entries(combatants)) {
      if (id === actorId) continue;
      const allyRole = getCombatRole(combatant);
      if (allyRole !== 'PLAYER' && allyRole !== 'PET') continue;
      if (resolveCombatantHp(combatant) > 0) return id;
    }
  }

  return null;
}

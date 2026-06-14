import { getCombatRole } from '../pet/petCombatRules.js';
import type { Combatant } from '../types.js';

/** Oponente humano em duelo PVP — exclui pets e o jogador local. */
export function resolvePvpOpponentActorId(
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string,
): string | null {
  const opponents = Object.entries(combatants).filter(
    ([id, combatant]) =>
      id !== playerActorId
      && !id.startsWith('pet_')
      && getCombatRole(combatant) === 'PLAYER',
  );
  if (opponents.length === 0) return null;

  opponents.sort(([a], [b]) => a.localeCompare(b));
  return opponents[0]?.[0] ?? null;
}

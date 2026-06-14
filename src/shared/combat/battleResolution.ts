import { getCombatRole, resolveCombatantHp } from '../pet/petCombatRules.js';
import type { Combatant } from '../types.js';
import { BattleType } from './battleType.js';

function listEnemies(combatants: Readonly<Record<string, Combatant>>): Combatant[] {
  return Object.values(combatants).filter((c) => getCombatRole(c) === 'ENEMY');
}

/** Oponentes hostis — criaturas PVE ou jogadores rivais em duelo PVP. */
function listHostileOpponents(
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string,
  battleType?: BattleType,
): Combatant[] {
  const enemies = listEnemies(combatants);
  if (enemies.length > 0) return enemies;

  const isPvp = battleType === BattleType.PVP
    || Object.entries(combatants).some(
      ([id, combatant]) =>
        id !== playerActorId
        && !id.startsWith('pet_')
        && getCombatRole(combatant) === 'PLAYER',
    );

  if (!isPvp) return [];

  return Object.entries(combatants)
    .filter(
      ([id, combatant]) =>
        id !== playerActorId
        && !id.startsWith('pet_')
        && getCombatRole(combatant) === 'PLAYER',
    )
    .map(([, combatant]) => combatant);
}

/**
 * Vitória/derrota PvE: só encerra quando o jogador cai ou todos os inimigos caem.
 * Pet ou aliados a 0 HP não encerram a luta.
 */
export function hasBattleEnded(
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string | undefined,
  battleType?: BattleType,
): boolean {
  if (playerActorId) {
    const player = combatants[playerActorId];
    if (!player || resolveCombatantHp(player) <= 0) return true;

    const opponents = listHostileOpponents(combatants, playerActorId, battleType);
    return opponents.length > 0 && opponents.every((opponent) => resolveCombatantHp(opponent) <= 0);
  }

  return Object.values(combatants).some((combatant) => {
    const role = getCombatRole(combatant);
    if (role === 'PET') return false;
    return resolveCombatantHp(combatant) <= 0;
  });
}

/** ID do vencedor quando a batalha terminou; null se ainda em curso. */
export function resolveBattleWinnerId(
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string | undefined,
  battleType?: BattleType,
): string | null {
  if (!hasBattleEnded(combatants, playerActorId, battleType)) return null;

  if (playerActorId) {
    const player = combatants[playerActorId];
    if (!player || resolveCombatantHp(player) <= 0) {
      for (const [id, combatant] of Object.entries(combatants)) {
        const role = getCombatRole(combatant);
        if ((role === 'ENEMY' || role === 'PLAYER') && id !== playerActorId && resolveCombatantHp(combatant) > 0) {
          return id;
        }
      }
      return null;
    }

    const opponents = listHostileOpponents(combatants, playerActorId, battleType);
    if (opponents.length > 0 && opponents.every((opponent) => resolveCombatantHp(opponent) <= 0)) {
      return playerActorId;
    }
    return null;
  }

  const firstZero = Object.entries(combatants).find(([, c]) => {
    if (getCombatRole(c) === 'PET') return false;
    return resolveCombatantHp(c) <= 0;
  });
  return firstZero?.[0] ?? null;
}

export function didPlayerWinBattle(
  state: { phase: string; combatants: Readonly<Record<string, Combatant>>; battleType?: BattleType },
  playerActorId: string,
): boolean {
  if (state.phase !== 'ENDED') return false;
  const player = state.combatants[playerActorId];
  if (!player || resolveCombatantHp(player) <= 0) return false;

  const opponents = listHostileOpponents(state.combatants, playerActorId, state.battleType);
  return opponents.length > 0 && opponents.every((opponent) => resolveCombatantHp(opponent) <= 0);
}

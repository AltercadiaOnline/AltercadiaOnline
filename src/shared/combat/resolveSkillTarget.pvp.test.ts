import { describe, expect, it } from 'vitest';
import { resolveAttackTargetId } from './petTurnOrder.js';
import { isHostileCombatTarget, resolveSkillTargetId } from './resolveSkillTarget.js';
import { MoveTarget } from './classMovesetCatalog.js';
import type { Combatant } from '../types/combat.js';

function player(id: string, hp = 100): Combatant {
  return {
    id,
    name: id,
    hp,
    maxHp: 100,
    hpCurrent: hp,
    hpMax: 100,
    skills: [],
    combatRole: 'PLAYER',
  };
}

function enemy(id: string, hp = 50): Combatant {
  return {
    id,
    name: id,
    hp,
    maxHp: 50,
    hpCurrent: hp,
    hpMax: 50,
    skills: [],
    combatRole: 'ENEMY',
  };
}

describe('resolveAttackTargetId / PvP', () => {
  it('PvE: PLAYER mira ENEMY', () => {
    const combatants = { a: player('a'), enemy_rat: enemy('enemy_rat') };
    expect(resolveAttackTargetId('a', combatants, 'a')).toBe('enemy_rat');
  });

  it('PvP: PLAYER mira rival PLAYER (sem ENEMY)', () => {
    const combatants = { peer_a: player('peer_a'), peer_b: player('peer_b') };
    expect(resolveAttackTargetId('peer_a', combatants, 'peer_a')).toBe('peer_b');
    expect(resolveAttackTargetId('peer_b', combatants, 'peer_b')).toBe('peer_a');
  });

  it('resolveSkillTargetId aceita requestedTargetId do rival PvP', () => {
    const combatants = { peer_a: player('peer_a'), peer_b: player('peer_b') };
    expect(isHostileCombatTarget('peer_a', 'peer_b', combatants)).toBe(true);
    expect(resolveSkillTargetId({
      actorId: 'peer_a',
      requestedTargetId: 'peer_b',
      moveTarget: MoveTarget.Enemy,
      combatants,
      playerActorId: 'peer_a',
    })).toBe('peer_b');
  });
});

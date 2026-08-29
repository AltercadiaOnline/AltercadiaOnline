import { describe, expect, it } from 'vitest';
import { CombatEventType } from '../../events.js';
import type { Combatant, CombatState } from '../../types.js';
import { BattleType } from '../battleType.js';
import {
  buildPvpJumbotronSnapshot,
  createIdlePvpJumbotronSnapshot,
  isPvpJumbotronSnapshot,
  pvpJumbotronSignature,
  resolvePvpJumbotronLastLogLine,
} from './pvpJumbotronSnapshot.js';
import { resolvePvpJumbotronWorldRect } from './pvpJumbotronLayout.js';

function fighter(overrides: Partial<Combatant> & { readonly id: string }): Combatant {
  return {
    name: overrides.name ?? 'A',
    hp: overrides.hp ?? 80,
    maxHp: overrides.maxHp ?? 100,
    skills: overrides.skills ?? [],
    skinBundleId: overrides.skinBundleId ?? 'player_male_1',
    ...overrides,
  };
}

function liveState(a: Combatant, b: Combatant): CombatState {
  return {
    battleId: 'b1',
    turn: 2,
    phase: 'CHOOSING',
    combatants: { [a.id]: a, [b.id]: b },
    activeActorId: a.id,
    battleType: BattleType.PVP,
  };
}

describe('pvpJumbotronSnapshot', () => {
  it('idle é o snapshot vazio', () => {
    const idle = createIdlePvpJumbotronSnapshot();
    expect(idle.phase).toBe('idle');
    expect(idle.sides).toEqual([null, null]);
    expect(isPvpJumbotronSnapshot(idle)).toBe(true);
  });

  it('monta os dois lados a partir do CombatState', () => {
    const snap = buildPvpJumbotronSnapshot({
      state: liveState(
        fighter({ id: 'a', name: 'Marco', hp: 40, maxHp: 100, skinBundleId: 'player_male_2' }),
        fighter({ id: 'b', name: 'Lia', hp: 90, maxHp: 90, skinBundleId: 'player_female_1' }),
      ),
      actorAId: 'a',
      actorBId: 'b',
      lastLogLine: 'Marco usou Soco → 12',
    });
    expect(snap.phase).toBe('in_battle');
    expect(snap.sides[0]).toEqual({
      displayName: 'Marco',
      skinBundleId: 'player_male_2',
      hp: 40,
      maxHp: 100,
    });
    expect(snap.sides[1]?.displayName).toBe('Lia');
    expect(snap.lastLogLine).toBe('Marco usou Soco → 12');
  });

  it('ENDED volta para idle', () => {
    const snap = buildPvpJumbotronSnapshot({
      state: { ...liveState(fighter({ id: 'a' }), fighter({ id: 'b' })), phase: 'ENDED' },
      actorAId: 'a',
      actorBId: 'b',
      lastLogLine: 'fim',
    });
    expect(snap).toEqual(createIdlePvpJumbotronSnapshot());
  });

  it('resolve a última linha de dano em terceira pessoa', () => {
    const combatants = {
      a: fighter({ id: 'a', name: 'Marco' }),
      b: fighter({ id: 'b', name: 'Lia' }),
    };
    const line = resolvePvpJumbotronLastLogLine(
      [
        {
          type: CombatEventType.DAMAGE_DEALT,
          payload: {
            battleId: 'b1',
            sourceId: 'a',
            targetId: 'b',
            amount: 24,
            hpAfter: 66,
            skillName: 'Investida',
            isCritical: true,
          },
        },
      ],
      combatants,
      '',
    );
    expect(line).toBe('Marco usou Investida → 24!');
  });

  it('assinatura muda quando o HP muda', () => {
    const a = buildPvpJumbotronSnapshot({
      state: liveState(fighter({ id: 'a', hp: 80 }), fighter({ id: 'b' })),
      actorAId: 'a',
      actorBId: 'b',
      lastLogLine: '',
    });
    const b = buildPvpJumbotronSnapshot({
      state: liveState(fighter({ id: 'a', hp: 40 }), fighter({ id: 'b' })),
      actorAId: 'a',
      actorBId: 'b',
      lastLogLine: '',
    });
    expect(pvpJumbotronSignature(a)).not.toBe(pvpJumbotronSignature(b));
  });
});

describe('pvpJumbotronLayout', () => {
  it('ancora no prop telao_pvp da cidade', () => {
    const rect = resolvePvpJumbotronWorldRect('city_01');
    expect(rect).not.toBeNull();
    expect(rect!.width).toBeGreaterThan(40);
    expect(rect!.height).toBeGreaterThan(40);
    expect(resolvePvpJumbotronWorldRect('farm_zone_01')).toBeNull();
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatEngine } from './CombatEngine.js';
import type { CombatClassId, CombatState, Combatant, SkillData } from '../../shared/types.js';
import type { ActionRequest } from '../../shared/events.js';

function makeSkill(id: string, damage: number, priority: 1 | 2 | 3): SkillData {
  return { id, name: id, damage, cooldown: 1, priority };
}

function makeCombatant(id: string, classId: CombatClassId, speed: number, heavyDamage: number): Combatant {
  // Dano calibrado para meta V1.2: 6-8 turnos em combate padrão (100 HP).
  return {
    id,
    name: id,
    classId,
    hp: 100,
    hpCurrent: 100,
    maxHp: 100,
    hpMax: 100,
    speedProfile: { flowSpeedBase: speed, activeMarcos: [], equipSpeedFlat: 0, buffSpeedFlat: 0, runeSpeedFlatConditional: 0 },
    skills: [makeSkill('heavy', heavyDamage, 1), makeSkill('setup', 0, 2)],
  };
}

function makeState(a: Combatant, b: Combatant, battleId: string): CombatState {
  return {
    battleId,
    turn: 1,
    phase: 'CHOOSING',
    activeActorId: a.id,
    combatants: { [a.id]: a, [b.id]: b },
  };
}

function runSingleFight(index: number, heavyDamage: number): { turns: number; firstActor: string; winner: string } {
  const a = makeCombatant('a', 'DISSOLUTUS', 38, heavyDamage);
  const b = makeCombatant('b', 'DISSOLUTUS', 38, heavyDamage);
  const engine = new CombatEngine(makeState(a, b, `sim-${index}`));
  let turns = 0;
  let firstActor = '';
  while (turns < 20) {
    const st = engine.getState();
    if (st.phase === 'ENDED') break;
    const requests: ActionRequest[] = [
      { battleId: st.battleId, actorId: 'a', turn: st.turn, skillId: 'heavy', requestId: `a-${st.turn}` },
      { battleId: st.battleId, actorId: 'b', turn: st.turn, skillId: 'heavy', requestId: `b-${st.turn}` },
    ];
    const order = engine.resolveTurnOrder(requests);
    if (!firstActor && order[0]) firstActor = order[0].actorId;
    engine.resolveTurn(requests);
    turns += 1;
  }
  const end = engine.getState();
  const hpA = end.combatants.a?.hp ?? 0;
  const hpB = end.combatants.b?.hp ?? 0;
  return { turns, firstActor, winner: hpA >= hpB ? 'a' : 'b' };
}

test('Simulação V1.2: 1000 combates alvo de ritmo e fairness', () => {
  const standardRuns = 1000;
  const turns: number[] = [];
  let firstA = 0;
  let firstB = 0;
  for (let i = 0; i < standardRuns; i += 1) {
    const result = runSingleFight(i, 17);
    turns.push(result.turns);
    if (result.firstActor === 'a') firstA += 1;
    if (result.firstActor === 'b') firstB += 1;
  }
  const avgTurns = turns.reduce((acc, t) => acc + t, 0) / standardRuns;
  const estMinutes = avgTurns * 0.35;
  const firstActionRateA = firstA / Math.max(1, firstA + firstB);

  assert.ok(avgTurns >= 6 && avgTurns <= 8, `avgTurns=${avgTurns}`);
  assert.ok(estMinutes >= 2 && estMinutes <= 3, `estMinutes=${estMinutes}`);
  assert.ok(firstActionRateA <= 0.55, `firstActionRateA=${firstActionRateA}`);

  const strategicRuns = 250;
  const strategicTurns: number[] = [];
  for (let i = 0; i < strategicRuns; i += 1) {
    strategicTurns.push(runSingleFight(standardRuns + i, 11).turns);
  }
  const tailHighLevel = strategicTurns.filter((t) => t >= 10).length;
  assert.ok(tailHighLevel > 0, 'expected high-level tail >=10 turns in strategic matchup');
});

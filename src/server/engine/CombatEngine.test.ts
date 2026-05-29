import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatEventType, type ActionRequest } from '../../shared/events.js';
import type { CombatState, Combatant, SkillData } from '../../shared/types.js';
import { CombatEngine } from './CombatEngine.js';

function actor(
  id: string,
  opts: {
    hp?: number;
    classId?: Combatant['classId'];
    flowSpeedBase?: number;
    marcos?: string[];
    equip?: number;
    buff?: number;
    rune?: number;
    skills?: SkillData[];
  } = {},
): Combatant {
  const hp = opts.hp ?? 100;
  return {
    id,
    name: id,
    hp,
    maxHp: 100,
    hpCurrent: hp,
    hpMax: 100,
    classId: opts.classId ?? 'DISSOLUTUS',
    speedProfile: {
      flowSpeedBase: opts.flowSpeedBase ?? 20,
      activeMarcos: opts.marcos ?? [],
      equipSpeedFlat: opts.equip ?? 0,
      buffSpeedFlat: opts.buff ?? 0,
      runeSpeedFlatConditional: opts.rune ?? 0,
    },
    skills: opts.skills ?? [],
  };
}

function skill(id: string, priority: 1 | 2 | 3, damage = 20): SkillData {
  return { id, name: id, priority, damage, cooldown: 1 };
}

function buildState(combatants: Record<string, Combatant>, turn = 1, activeActorId: string | null = null): CombatState {
  return {
    battleId: 'battle-v12-001',
    turn,
    phase: activeActorId ? 'CHOOSING' : 'IDLE',
    activeActorId,
    combatants,
  };
}

test('DoD-1: contrato V1.2 carregado no motor', () => {
  const engine = new CombatEngine(buildState({ a: actor('a') }));
  assert.equal(engine.getConfigVersion(), '1.2.0');
});

test('Cenário 1: setup vs dano pesado sem buff', () => {
  const setupActor = actor('setup', { skills: [skill('setup_skill', 2)] });
  const heavyActor = actor('heavy', { skills: [skill('heavy_skill', 1)] });
  const engine = new CombatEngine(buildState({ setup: setupActor, heavy: heavyActor }, 1, 'setup'));
  const ordered = engine.resolveTurnOrder([
    { battleId: 'battle-v12-001', actorId: 'heavy', turn: 1, skillId: 'heavy_skill', requestId: 'r1' },
    { battleId: 'battle-v12-001', actorId: 'setup', turn: 1, skillId: 'setup_skill', requestId: 'r2' },
  ]);
  assert.equal(ordered[0]?.actorId, 'setup');
});

test('Cenário 2: dano pesado speed alta vs baixa', () => {
  const high = actor('high', { flowSpeedBase: 80, skills: [skill('atk', 1)] });
  const low = actor('low', { flowSpeedBase: 20, skills: [skill('atk', 1)] });
  const engine = new CombatEngine(buildState({ high, low }, 1, 'high'));
  const ordered = engine.resolveTurnOrder([
    { battleId: 'battle-v12-001', actorId: 'low', turn: 1, skillId: 'atk', requestId: 'r1' },
    { battleId: 'battle-v12-001', actorId: 'high', turn: 1, skillId: 'atk', requestId: 'r2' },
  ]);
  assert.equal(ordered[0]?.actorId, 'high');
});

test('Cenário 3: iniciante vs 3 marcos de speed', () => {
  const rookie = actor('rookie', { flowSpeedBase: 20, skills: [skill('atk', 1)] });
  const marco = actor('marco', {
    flowSpeedBase: 100,
    marcos: ['quickStep', 'fluxRush', 'timelessStride'],
    skills: [skill('atk', 1)],
  });
  const engine = new CombatEngine(buildState({ rookie, marco }, 1, 'rookie'));
  assert.ok(engine.computeEffectiveSpeed('marco') > engine.computeEffectiveSpeed('rookie'));
});

test('Cenário 4: tônico menor inverte ordem em matchup equilibrado', () => {
  const a = actor('a', { flowSpeedBase: 40, skills: [skill('atk', 1)] });
  const b = actor('b', { flowSpeedBase: 40, skills: [skill('atk', 1)] });
  const engine = new CombatEngine(buildState({ a, b }, 1, 'a'));
  const first = engine.resolveTurnOrder([
    { battleId: 'battle-v12-001', actorId: 'a', turn: 1, skillId: 'atk', requestId: 'r1' },
    { battleId: 'battle-v12-001', actorId: 'b', turn: 1, skillId: 'atk', requestId: 'r2' },
  ])[0]?.actorId;
  const usePotion: ActionRequest = {
    battleId: 'battle-v12-001',
    actorId: 'a',
    turn: 1,
    skillId: null,
    requestId: 'pot',
    consumableId: 'tonico_fluxo_menor',
    consumableHeal: 0,
  };
  engine.applyAction(usePotion);
  const st = engine.getState();
  const withPotionOrder = engine.resolveTurnOrder([
    { battleId: st.battleId, actorId: st.activeActorId ?? 'b', turn: st.turn, skillId: 'atk', requestId: 'r3' },
    { battleId: st.battleId, actorId: 'a', turn: st.turn, skillId: 'atk', requestId: 'r4' },
  ])[0]?.actorId;
  assert.notEqual(first, withPotionOrder);
});

test('Cenário 5: runa condicional em BLOCK só no próximo turno', () => {
  const blocker = actor('blocker', { flowSpeedBase: 30, rune: 0, skills: [skill('atk', 1)] });
  const enemy = actor('enemy', { flowSpeedBase: 30, skills: [skill('atk', 1)] });
  const engine = new CombatEngine(buildState({ blocker, enemy }, 1, 'blocker'));
  const before = engine.computeEffectiveSpeed('blocker');
  const st = engine.getState();
  const boostedState: CombatState = {
    ...st,
    turn: 2,
    phase: 'CHOOSING',
    activeActorId: 'blocker',
    combatants: {
      ...st.combatants,
      blocker: {
        ...st.combatants.blocker!,
        speedProfile: { ...st.combatants.blocker!.speedProfile!, runeSpeedFlatConditional: 7 },
      },
    },
  };
  const boostedEngine = new CombatEngine(boostedState);
  assert.ok(boostedEngine.computeEffectiveSpeed('blocker') > before);
});

test('Cenário 6: cap de equipamento respeitado', () => {
  const capped = actor('cap', { flowSpeedBase: 50, equip: 99, skills: [skill('atk', 1)] });
  const engine = new CombatEngine(buildState({ cap: capped }));
  const speed = engine.computeEffectiveSpeed('cap');
  // 50 + marcos(11) + equip cap(18) + class(0)
  assert.equal(speed, 79);
});

test('Cenário 7: empate total com seed determinística reproduzível', () => {
  const a = actor('a', { flowSpeedBase: 40, skills: [skill('atk', 1)] });
  const b = actor('b', { flowSpeedBase: 40, skills: [skill('atk', 1)] });
  const requests: ActionRequest[] = [
    { battleId: 'battle-v12-001', actorId: 'a', turn: 1, skillId: 'atk', requestId: 'r1' },
    { battleId: 'battle-v12-001', actorId: 'b', turn: 1, skillId: 'atk', requestId: 'r2' },
  ];
  const e1 = new CombatEngine(buildState({ a, b }, 1, 'a'));
  const e2 = new CombatEngine(buildState({ a, b }, 1, 'a'));
  const o1 = e1.resolveTurnOrder(requests).map((r) => r.actorId).join(',');
  const o2 = e2.resolveTurnOrder(requests).map((r) => r.actorId).join(',');
  assert.equal(o1, o2);
});

test('Cenário 8: buff expirando retorna baseline', () => {
  const actorBuff = actor('buffed', { flowSpeedBase: 40, buff: 10, skills: [skill('atk', 1)] });
  const baseline = actor('baseline', { flowSpeedBase: 40, buff: 0, skills: [skill('atk', 1)] });
  const boosted = new CombatEngine(buildState({ buffed: actorBuff, baseline }, 1, 'buffed'));
  assert.ok(boosted.computeEffectiveSpeed('buffed') > boosted.computeEffectiveSpeed('baseline'));

  const st = boosted.getState();
  const expired: CombatState = {
    ...st,
    turn: 2,
    combatants: {
      ...st.combatants,
      buffed: {
        ...st.combatants.buffed!,
        speedProfile: { ...st.combatants.buffed!.speedProfile!, buffSpeedFlat: 0 },
      },
    },
  };
  const expiredEngine = new CombatEngine(expired);
  assert.equal(expiredEngine.computeEffectiveSpeed('buffed'), expiredEngine.computeEffectiveSpeed('baseline'));
});

test('Iniciativa score_based: initiativeScore = movesetPriorityScore + (speedBonusTotal * 2)', () => {
  const a = actor('a', { flowSpeedBase: 40, skills: [skill('atk', 1)] });
  const b = actor('b', { flowSpeedBase: 40, skills: [skill('setup', 2)] });
  const engine = new CombatEngine(buildState({ a, b }, 1, 'a'));
  const events = engine.resolveTurn([
    { battleId: 'battle-v12-001', actorId: 'a', turn: 1, skillId: 'atk', requestId: 'r1' },
    { battleId: 'battle-v12-001', actorId: 'b', turn: 1, skillId: 'setup', requestId: 'r2' },
  ]);
  const resolved = events.find((e) => e.type === CombatEventType.TURN_ORDER_RESOLVED);
  if (!resolved || resolved.type !== CombatEventType.TURN_ORDER_RESOLVED) {
    assert.fail('Expected TURN_ORDER_RESOLVED');
  }
  const setupDebug = resolved.payload.debug.find((d) => d.actorId === 'b');
  const atkDebug = resolved.payload.debug.find((d) => d.actorId === 'a');
  assert.ok(setupDebug && atkDebug);
  if (!setupDebug || !atkDebug) return;
  assert.equal(setupDebug.initiativeScore, setupDebug.movesetPriorityScore + setupDebug.speedBonusTotal * 2);
  assert.equal(atkDebug.initiativeScore, atkDebug.movesetPriorityScore + atkDebug.speedBonusTotal * 2);
  assert.ok(setupDebug.initiativeScore > atkDebug.initiativeScore);
});

test('Observabilidade: TURN_ORDER_RESOLVED inclui reason e debug', () => {
  const a = actor('a', { flowSpeedBase: 40, skills: [skill('setup', 2)] });
  const b = actor('b', { flowSpeedBase: 30, skills: [skill('atk', 1)] });
  const engine = new CombatEngine(buildState({ a, b }, 1, 'a'));
  const events = engine.resolveTurn([
    { battleId: 'battle-v12-001', actorId: 'b', turn: 1, skillId: 'atk', requestId: 'r1' },
    { battleId: 'battle-v12-001', actorId: 'a', turn: 1, skillId: 'setup', requestId: 'r2' },
  ]);
  const resolved = events.find((e) => e.type === CombatEventType.TURN_ORDER_RESOLVED);
  assert.ok(resolved && resolved.type === CombatEventType.TURN_ORDER_RESOLVED);
  if (!resolved || resolved.type !== CombatEventType.TURN_ORDER_RESOLVED) return;
  assert.equal(resolved.payload.reason, 'PRIORITY');
  assert.ok(resolved.payload.debug.length >= 2);
});

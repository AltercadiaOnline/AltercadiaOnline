import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameClient, getBattleHud } from './index.js';
import { buildCombatUiHints, type CombatDispatchPayload } from '../../shared/combatWire.js';
import { CombatEventType } from '../../shared/events.js';
import type { CombatState } from '../../shared/types.js';

const PLAYER_ID = 'player_1';

function minimalCombatState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    battleId: 'battle-test-001',
    turn: 1,
    phase: 'CHOOSING',
    activeActorId: PLAYER_ID,
    combatants: {
      [PLAYER_ID]: {
        id: PLAYER_ID,
        name: 'Player',
        hp: 100,
        maxHp: 100,
        skills: [],
      },
    },
    ...overrides,
  };
}

describe('GameClient - Integração de SKILL_CATALOG', () => {
  beforeEach(() => {
    GameClient.reset();
  });

  it('deve processar o SKILL_CATALOG e disponibilizar as skills no cache', () => {
    const turnUpdate = {
      battleId: 'battle-test-001',
      turn: 1,
      phase: 'CHOOSING' as const,
      activeActorId: PLAYER_ID,
      combatants: minimalCombatState().combatants,
    };

    const mockPayload: CombatDispatchPayload = {
      events: [
        { type: CombatEventType.TURN_START, payload: turnUpdate },
        {
          type: CombatEventType.SKILL_CATALOG,
          payload: {
            actorId: PLAYER_ID,
            skills: [
              { id: 'strike', name: 'Golpe Direto', damage: 20, cooldown: 1 },
              { id: 'defend', name: 'Defender', damage: 0, cooldown: 0 },
            ],
          },
        },
      ],
      state: minimalCombatState(),
      ui: buildCombatUiHints(minimalCombatState(), PLAYER_ID),
    };

    GameClient.handleCombatDispatch(mockPayload);

    const cachedSkills = GameClient.getSkillCache(PLAYER_ID);

    assert.ok(cachedSkills.length > 0);
    assert.equal(cachedSkills.length, 2);
    assert.equal(cachedSkills[0]?.id, 'strike');
    assert.equal(cachedSkills[1]?.name, 'Defender');
  });

  it('não deve quebrar se o SKILL_CATALOG estiver vazio', () => {
    const mockPayload: CombatDispatchPayload = {
      events: [
        {
          type: CombatEventType.SKILL_CATALOG,
          payload: { actorId: PLAYER_ID, skills: [] },
        },
      ],
      state: minimalCombatState(),
      ui: buildCombatUiHints(minimalCombatState(), PLAYER_ID),
    };

    assert.doesNotThrow(() => {
      GameClient.handleCombatDispatch(mockPayload);
    });

    assert.equal(GameClient.getSkillCache(PLAYER_ID).length, 0);
  });

  it('renderState repinta paleta em CHOOSING mesmo sem SKILL_CATALOG no wire', () => {
    const state = minimalCombatState({
      combatants: {
        [PLAYER_ID]: {
          id: PLAYER_ID,
          name: 'Player',
          hp: 100,
          maxHp: 100,
          skills: [
            { id: 'strike', name: 'Golpe Direto', damage: 20, cooldown: 1 },
          ],
        },
      },
    });

    GameClient.consumeCombatEvents([
      {
        type: CombatEventType.TURN_START,
        payload: {
          battleId: state.battleId,
          turn: state.turn,
          phase: 'CHOOSING',
          activeActorId: PLAYER_ID,
          combatants: state.combatants,
        },
      },
    ]);

    GameClient.reset();
    GameClient.consumeCombatEvents([]);

    assert.equal(GameClient.getSkillCache(PLAYER_ID).length, 0);

    GameClient.renderState(state, buildCombatUiHints(state, PLAYER_ID));

    assert.equal(GameClient.getSkillCache(PLAYER_ID).length, 0);
    const hud = getBattleHud();
    assert.ok(hud);
    assert.equal(hud.getLastTurn()?.phase, 'CHOOSING');
    assert.equal(hud.getLastTurn()?.activeActorId, PLAYER_ID);
  });
});

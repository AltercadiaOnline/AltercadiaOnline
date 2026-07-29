import { describe, expect, it } from 'vitest';
import type { CombatState } from '../types.js';
import { BattleType } from './battleType.js';
import { enrichCombatDispatchTurnTimerUi } from './enrichCombatTurnTimerUi.js';
import type { CombatDispatchPayload } from '../combatWire.js';

function baseState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    battleId: 'battle-local-1',
    turn: 1,
    phase: 'CHOOSING',
    activeActorId: 'player_1',
    combatants: {
      player_1: {
        id: 'player_1',
        name: 'P',
        hp: 100,
        maxHp: 100,
        hpCurrent: 100,
        hpMax: 100,
        skills: [],
        statusEffects: [],
        activeStatuses: [],
        activeShields: [],
        temporaryModifiers: [],
        lockedSkillIds: [],
      },
      enemy_rat: {
        id: 'enemy_rat',
        name: 'Rato',
        hp: 40,
        maxHp: 40,
        hpCurrent: 40,
        hpMax: 40,
        skills: [],
        statusEffects: [],
        activeStatuses: [],
        activeShields: [],
        temporaryModifiers: [],
        lockedSkillIds: [],
      },
    },
    battleType: BattleType.PVE,
    ...overrides,
  };
}

describe('enrichCombatDispatchTurnTimerUi', () => {
  it('anexa turnDeadlineMs quando é a vez do jogador', () => {
    const windows = new Map();
    const payload: CombatDispatchPayload = {
      events: [],
      state: baseState(),
      ui: {
        actionsEnabled: false,
        activeActorId: null,
        playerActorId: 'player_1',
      },
    };

    const enriched = enrichCombatDispatchTurnTimerUi(payload, 'player_1', windows, 'battle-local-1');
    expect(enriched.ui.actionsEnabled).toBe(true);
    expect(typeof enriched.ui.turnDeadlineMs).toBe('number');
    expect((enriched.ui.turnDeadlineMs ?? 0) > Date.now()).toBe(true);
    expect(windows.has('battle-local-1')).toBe(true);
  });

  it('não anexa deadline fora da janela de escolha', () => {
    const windows = new Map();
    const payload: CombatDispatchPayload = {
      events: [],
      state: baseState({ phase: 'RESOLVING', activeActorId: 'enemy_rat' }),
      ui: {
        actionsEnabled: false,
        activeActorId: 'enemy_rat',
        playerActorId: 'player_1',
      },
    };

    const enriched = enrichCombatDispatchTurnTimerUi(payload, 'player_1', windows, 'battle-local-1');
    expect(enriched.ui.actionsEnabled).toBe(false);
    expect(enriched.ui.turnDeadlineMs).toBeUndefined();
  });
});

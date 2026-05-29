import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatEventType } from '../../shared/events.js';
import type { TurnUpdate } from '../../shared/events.js';
import { buildCombatUiHints } from '../../shared/combatWire.js';
import type { CombatState } from '../../shared/types.js';
import { HUDManager } from './HUDManager.js';

function mockActionsEl(): HTMLElement & { readonly childButtons: HTMLElement[] } {
  const childButtons: HTMLElement[] = [];
  const doc = {
    createElement: (_tag: string) => {
      const btn = {
        type: 'button',
        className: '',
        textContent: '',
        disabled: false,
        dataset: {} as DOMStringMap,
        addEventListener: () => {},
        ownerDocument: doc,
      };
      return btn as unknown as HTMLElement;
    },
  };
  return {
    innerHTML: '',
    classList: { toggle: () => {} },
    toggleAttribute: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    appendChild: (child: HTMLElement) => {
      childButtons.push(child);
    },
    ownerDocument: doc,
    childButtons,
  } as unknown as HTMLElement & { readonly childButtons: HTMLElement[] };
}

test('HUDManager: TURN_START CHOOSING pinta botões a partir de combatants.skills', () => {
  const actions = mockActionsEl();
  const hud = new HUDManager({ elements: { actions } });
  const payload: TurnUpdate = {
    battleId: 'b1',
    turn: 1,
    phase: 'CHOOSING',
    activeActorId: 'hero',
    combatants: {
      hero: {
        id: 'hero',
        name: 'Hero',
        hp: 100,
        maxHp: 100,
        skills: [{ id: 'atk', name: 'Golpe', damage: 10, cooldown: 0 }],
      },
    },
  };
  const state: CombatState = {
    battleId: payload.battleId,
    turn: payload.turn,
    phase: 'CHOOSING',
    activeActorId: payload.activeActorId,
    combatants: payload.combatants,
  };
  hud.syncSkillPaletteFromCombatState(state, buildCombatUiHints(state, 'hero'));
  assert.equal(actions.childButtons.length, 1);
  actions.childButtons.length = 0;
  hud.consume({ type: CombatEventType.TURN_START, payload });
  assert.equal(actions.childButtons.length, 1);
  assert.equal(actions.childButtons[0]?.textContent, 'Golpe');
});

test('HUDManager: SKILL_CATALOG atualiza paleta do ator ativo', () => {
  const actions = mockActionsEl();
  const hud = new HUDManager({ elements: { actions } });
  const state: CombatState = {
    battleId: 'b1',
    turn: 1,
    phase: 'CHOOSING',
    activeActorId: 'hero',
    combatants: {
      hero: {
        id: 'hero',
        name: 'Hero',
        hp: 100,
        maxHp: 100,
        skills: [],
      },
    },
  };
  hud.syncSkillPaletteFromCombatState(state, buildCombatUiHints(state, 'hero'));
  hud.consume({
    type: CombatEventType.TURN_START,
    payload: {
      battleId: state.battleId,
      turn: state.turn,
      phase: 'CHOOSING',
      activeActorId: 'hero',
      combatants: state.combatants,
    },
  });
  hud.consume({
    type: CombatEventType.SKILL_CATALOG,
    payload: {
      actorId: 'hero',
      skills: [{ id: 's1', name: 'Skill A', damage: 5, cooldown: 0 }],
    },
  });
  assert.equal(actions.childButtons.length, 1);
  assert.equal(actions.childButtons[0]?.textContent, 'Skill A');
});

test('HUDManager: syncSkillPaletteFromCombatState usa combatants.skills sem cache', () => {
  const actions = mockActionsEl();
  const hud = new HUDManager({ elements: { actions } });
  const state: CombatState = {
    battleId: 'b1',
    turn: 1,
    phase: 'CHOOSING',
    activeActorId: 'hero',
    combatants: {
      hero: {
        id: 'hero',
        name: 'Hero',
        hp: 100,
        maxHp: 100,
        skills: [{ id: 'atk', name: 'Golpe', damage: 10, cooldown: 0 }],
      },
    },
  };
  hud.syncSkillPaletteFromCombatState(state, buildCombatUiHints(state, 'hero'));
  assert.equal(actions.childButtons.length, 1);
  assert.equal(actions.childButtons[0]?.textContent, 'Golpe');
});

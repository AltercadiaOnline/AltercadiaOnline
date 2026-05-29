import type { ActionRequest, CombatEvent } from '../../shared/events.js';
import type { CombatDispatchPayload, CombatUiHints } from '../../shared/combatWire.js';
export type { CombatDispatchPayload, CombatUiHints } from '../../shared/combatWire.js';
export { isCombatDispatchPayload, buildCombatUiHints } from '../../shared/combatWire.js';
import type { CombatState } from '../../shared/types.js';
import {
  attachCombatSocketListener,
  type CombatSocket,
} from './combatSocketHandler.js';

export {
  attachCombatSocketListener,
  createCombatSocketHandler,
  type CombatSocket,
  type CombatHudBridge,
} from './combatSocketHandler.js';
import { HUDManager } from './HUDManager.js';

let hud: HUDManager | null = null;
let lastDispatch: CombatDispatchPayload | null = null;
let emitCombatAction: ((action: ActionRequest) => void) | undefined;

export type CombatClientConfig = {
  /** Ex.: `(action) => socket.emit('combat-action', action)` */
  readonly emitAction?: (action: ActionRequest) => void;
};

export function configureCombatClient(config: CombatClientConfig = {}): void {
  emitCombatAction = config.emitAction;
}

export function initBattleHud(root: ParentNode = document): HUDManager {
  const actions =
    root.querySelector<HTMLElement>('#skill-palette-row')
    ?? root.querySelector<HTMLElement>('[data-hud-skill-actions]')
    ?? root.querySelector<HTMLElement>('#battle-command-row');

  hud = new HUDManager({
    elements: {
      root: root.querySelector<HTMLElement>('#battle-layer') ?? root.querySelector<HTMLElement>('[data-battle-hud]'),
      turnLabel: root.querySelector<HTMLElement>('#battle-turn-hud'),
      log: root.querySelector<HTMLElement>('#battle-log-window'),
      actions,
    },
    onSkillClick: (skillId, actorId) => {
      GameClient.sendSkillChoice(skillId, actorId);
    },
  });

  return hud;
}

export function getBattleHud(): HUDManager | null {
  return hud;
}

export function getLastCombatState(): CombatState | null {
  return lastDispatch?.state ?? null;
}

export function getLastDispatch(): CombatDispatchPayload | null {
  return lastDispatch;
}

function ensureHud(): HUDManager {
  if (!hud) {
    hud = new HUDManager({ elements: {} });
  }
  return hud;
}

export const GameClient = {
  /** Limpa HUD, cache de skills e snapshot (uso em testes / troca de batalha). */
  reset(): void {
    hud?.clearSkillCache();
    hud = null;
    lastDispatch = null;
  },

  /** Catálogo sincronizado via SKILL_CATALOG para um ator. */
  getSkillCache(actorId: string): readonly { id: string; name: string }[] {
    return hud?.getSkillCache(actorId) ?? [];
  },

  /**
   * Handler único para o canal `combat-event` do WebSocket.
   * Processa eventos V1.2 e atualiza a HUD com o snapshot do servidor.
   */
  handleCombatDispatch(data: CombatDispatchPayload): void {
    lastDispatch = data;
    GameClient.consumeCombatEvents(data.events);
    GameClient.renderState(data.state, data.ui);
  },

  /** Ponto de entrada da HUD para enviar intenções ao motor. */
  sendAction(action: ActionRequest): void {
    if (emitCombatAction) {
      emitCombatAction(action);
      return;
    }
    console.log('[HUD] Action (sem socket configurado):', action);
  },

  sendSkillChoice(skillId: string, _actorIdFromClick: string): void {
    const dispatch = lastDispatch;
    if (!dispatch) {
      console.warn('[HUD] sendSkillChoice ignorado — aguardando combat-event do servidor.');
      return;
    }
    const { state, ui } = dispatch;
    const action: ActionRequest = {
      battleId: state.battleId,
      actorId: ui.playerActorId,
      turn: state.turn,
      skillId,
      requestId: `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    GameClient.sendAction(action);
  },

  /** Aplica eventos do servidor/gateway na paleta e barras. */
  consumeCombatEvents(events: readonly CombatEvent[]): void {
    const manager = ensureHud();
    for (const event of events) {
      manager.consume(event);
    }
  },

  /**
   * Atualiza snapshot (HP + paleta) após processar eventos.
   * Proxy UI: repinta botões a partir de combatants (cache só como fallback).
   */
  renderState(state: CombatState, ui: CombatUiHints): void {
    const manager = hud ?? ensureHud();
    manager.syncCombatantsFromState(state.combatants);
    manager.syncSkillPaletteFromCombatState(state, ui);
  },
};

/**
 * Handler robusto para o canal `combat-event` (API de um argumento).
 * @example registerCombatSocketHandler(socket);
 */
export function registerCombatSocketHandler(
  socket: import('./combatSocketHandler.js').CombatSocket,
): void {
  attachCombatSocketListener(socket, GameClient);
}

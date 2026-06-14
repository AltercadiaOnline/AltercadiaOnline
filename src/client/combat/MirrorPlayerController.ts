import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import { CombatEventType, type ActionRequest } from '../../shared/events.js';
import { canExecuteMove } from '../../shared/combat/skillRuntime.js';
import {
  isMirrorBotActorId,
  isMirrorBotName,
} from '../../shared/combat/mirrorPlayerConfig.js';
import {
  emitMirrorPlayerEvent,
  MirrorPlayerEventType,
} from '../../shared/combat/mirrorPlayerEvents.js';
import { resolvePvpOpponentActorId } from '../../shared/combat/resolvePvpOpponent.js';
import { isMirrorBotCombatant } from '../../shared/combat/resolveBattleOpponent.js';
import {
  clearBattleObservationState,
  setMirrorObservationContext,
} from './battleObservationState.js';

type MirrorActionEmitter = (action: ActionRequest) => void;

let emitMirrorAction: MirrorActionEmitter | null = null;
let activeMirrorActorId: string | null = null;
let mirrorActionScheduled = false;
let lastHandledMirrorTurn = -1;

const MIRROR_ACTION_DELAY_MS = 480;

export function configureMirrorPlayerClient(emitter: MirrorActionEmitter | null): void {
  emitMirrorAction = emitter;
}

export function getActiveMirrorActorId(): string | null {
  return activeMirrorActorId;
}

export function resetMirrorPlayerClient(): void {
  activeMirrorActorId = null;
  mirrorActionScheduled = false;
  lastHandledMirrorTurn = -1;
  clearBattleObservationState();
}

function resolveMirrorActorFromDispatch(dispatch: CombatDispatchPayload): string | null {
  const opponentId = resolvePvpOpponentActorId(
    dispatch.state.combatants,
    dispatch.ui.playerActorId,
  );
  if (!opponentId) return null;
  const opponent = dispatch.state.combatants[opponentId];
  if (!opponent || !isMirrorBotCombatant(opponent)) return null;
  return opponentId;
}

function pickMirrorSkill(
  dispatch: CombatDispatchPayload,
  mirrorActorId: string,
): string | null {
  const mirror = dispatch.state.combatants[mirrorActorId];
  if (!mirror) return null;

  const ready = mirror.skills.filter((skill) => canExecuteMove(skill, dispatch.state.turn));
  if (ready.length === 0) return mirror.skills[0]?.id ?? null;

  const index = Math.floor(Math.random() * ready.length);
  return ready[index]?.id ?? ready[0]?.id ?? null;
}

function scheduleMirrorAutoAction(dispatch: CombatDispatchPayload, mirrorActorId: string): void {
  if (!emitMirrorAction || mirrorActionScheduled) return;
  if (dispatch.state.phase !== 'CHOOSING') return;
  if (dispatch.state.activeActorId !== mirrorActorId) return;
  if (lastHandledMirrorTurn === dispatch.state.turn) return;

  mirrorActionScheduled = true;
  const turn = dispatch.state.turn;
  const battleId = dispatch.state.battleId;

  window.setTimeout(() => {
    mirrorActionScheduled = false;
    const skillId = pickMirrorSkill(dispatch, mirrorActorId);
    if (!skillId || !emitMirrorAction) return;

    const action: ActionRequest = {
      battleId,
      actorId: mirrorActorId,
      turn,
      skillId,
      requestId: `mirror-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    emitMirrorPlayerEvent({
      type: MirrorPlayerEventType.MOVE_USED,
      payload: {
        battleId,
        mirrorActorId,
        skillId,
        turn,
      },
    });

    emitMirrorAction(action);
    lastHandledMirrorTurn = turn;
  }, MIRROR_ACTION_DELAY_MS);
}

function ingestMirrorNetworkEvents(dispatch: CombatDispatchPayload, mirrorActorId: string): void {
  for (const event of dispatch.events) {
    if (event.type === CombatEventType.BATTLE_START) {
      const mirror = dispatch.state.combatants[mirrorActorId];
      emitMirrorPlayerEvent({
        type: MirrorPlayerEventType.BATTLE_STARTED,
        payload: {
          battleId: dispatch.state.battleId,
          mirrorActorId,
          mirrorName: mirror?.name ?? mirrorActorId,
          classId: mirror?.classId ?? 'COGITOR',
        },
      });
    }

    if (event.type === CombatEventType.SKILL_USED) {
      const actorId = event.payload.actorId;
      if (actorId === mirrorActorId || isMirrorBotActorId(actorId)) {
        emitMirrorPlayerEvent({
          type: MirrorPlayerEventType.MOVE_USED,
          payload: {
            battleId: dispatch.state.battleId,
            mirrorActorId: actorId,
            skillId: event.payload.skillId,
            turn: dispatch.state.turn,
          },
        });
      }
    }
  }
}

/** Espelha eventos de rede e automatiza turnos do bot na batalha atual. */
export function notifyMirrorPlayerDispatch(dispatch: CombatDispatchPayload): void {
  const mirrorActorId = resolveMirrorActorFromDispatch(dispatch);

  if (!mirrorActorId) {
    if (activeMirrorActorId !== null && dispatch.state.phase === 'ENDED') {
      resetMirrorPlayerClient();
    }
    return;
  }

  if (activeMirrorActorId !== mirrorActorId) {
    activeMirrorActorId = mirrorActorId;
    lastHandledMirrorTurn = -1;
  }

  const mirror = dispatch.state.combatants[mirrorActorId];
  setMirrorObservationContext({
    mirrorActorId,
    mirrorName: mirror?.name ?? mirrorActorId,
    battleId: dispatch.state.battleId,
    battleType: dispatch.state.battleType ?? 'PVP',
  });

  ingestMirrorNetworkEvents(dispatch, mirrorActorId);
  scheduleMirrorAutoAction(dispatch, mirrorActorId);

  if (dispatch.state.phase === 'ENDED') {
    resetMirrorPlayerClient();
  }
}

export function isMirrorBotDisplayName(name: string): boolean {
  return isMirrorBotName(name);
}

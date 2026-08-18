import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import type { DuelInviteRespondPayload } from '../../../shared/social/casualDuelTypes.js';
import { getCasualDuelInviteStore } from '../../social/casualDuelInviteStore.js';

export class DuelInviteRespondHandler extends BaseIntentHandler<DuelInviteRespondPayload> {
  readonly actionType = 'DUEL_INVITE_RESPOND';

  async execute(playerId: string, payload: DuelInviteRespondPayload, intentId: string): Promise<void> {
    const inviteId = typeof payload.inviteId === 'string' ? payload.inviteId.trim() : '';
    const accept = payload.accept === true;
    if (!inviteId) {
      this.sendResponse(playerId, intentId, false, 'Convite inválido.');
      return;
    }

    const result = getCasualDuelInviteStore().respond(playerId, this.characterId, inviteId, accept);
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }

    const message = accept
      ? (result.snapshot.phase === 'countdown'
        ? 'Desafio aceito. A batalha começa em 5 segundos.'
        : 'Não foi possível aceitar o desafio.')
      : (result.snapshot.cancelReason === 'self'
        ? 'Desafio cancelado.'
        : 'Desafio recusado.');

    this.sendResponse(playerId, intentId, true, {
      inviteId: result.snapshot.inviteId,
      accepted: accept,
      phase: result.snapshot.phase,
      message,
    });
  }
}

let handler: DuelInviteRespondHandler | null = null;

export function getDuelInviteRespondHandler(): DuelInviteRespondHandler {
  if (!handler) handler = new DuelInviteRespondHandler();
  return handler;
}

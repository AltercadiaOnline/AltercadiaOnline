import { NPC_INTERACTION_RADIUS_TILES } from '../../../shared/world/npcRegistry.js';
import { resolveMapTileSize } from '../../../shared/world/activeMapTileSize.js';
import type { TradeRequestPayload } from '../../../shared/social/tradeRequestProtocol.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import { getPlayerSocket } from '../../net/playerSocketLookup.js';
import { notifyPlayer } from '../../net/logServiceChannel.js';

function findExploringByPlayerId(playerId: string) {
  return getWorldGameState()
    .listAllActive()
    .find((entry) => entry.playerId === playerId && entry.status === 'exploring') ?? null;
}

/**
 * Pedido de trade — valida proximidade no mesmo mapa e notifica o alvo.
 * A sessão/janela de troca será adicionada numa leva seguinte.
 */
export class TradeRequestHandler extends BaseIntentHandler<TradeRequestPayload> {
  readonly actionType = 'TRADE_REQUEST';

  async execute(
    playerId: string,
    payload: TradeRequestPayload,
    intentId: string,
  ): Promise<void> {
    const targetPlayerId = typeof payload.targetPlayerId === 'string'
      ? payload.targetPlayerId.trim()
      : '';
    if (!targetPlayerId) {
      this.sendResponse(playerId, intentId, false, 'Alvo de trade inválido.');
      return;
    }
    if (targetPlayerId === playerId) {
      this.sendResponse(playerId, intentId, false, 'Não é possível trocar consigo mesmo.');
      return;
    }

    const requester = findExploringByPlayerId(playerId);
    if (!requester) {
      this.sendResponse(playerId, intentId, false, 'Você precisa estar no mundo para pedir trade.');
      return;
    }

    const target = findExploringByPlayerId(targetPlayerId);
    if (!target) {
      this.sendResponse(playerId, intentId, false, 'Jogador indisponível ou offline.');
      return;
    }
    if (target.mapId !== requester.mapId) {
      this.sendResponse(playerId, intentId, false, 'O jogador não está no mesmo mapa.');
      return;
    }

    const tileSize = resolveMapTileSize(requester.mapId);
    const maxDistPx = NPC_INTERACTION_RADIUS_TILES * tileSize * 2;
    const distance = Math.hypot(target.x - requester.x, target.y - requester.y);
    if (distance > maxDistPx) {
      this.sendResponse(playerId, intentId, false, 'Chegue mais perto para pedir trade.');
      return;
    }

    const targetName = target.displayName.trim() || 'Jogador';
    const requesterName = requester.displayName.trim() || 'Jogador';
    const message = `Pedido de trade enviado para ${targetName}.`;

    const targetSocket = getPlayerSocket(targetPlayerId);
    if (targetSocket) {
      notifyPlayer(targetSocket, `${requesterName} quer trocar itens com você.`);
    }

    this.sendResponse(playerId, intentId, true, {
      targetPlayerId,
      targetDisplayName: targetName,
      message,
    });
  }
}

let handler: TradeRequestHandler | null = null;

export function getTradeRequestHandler(): TradeRequestHandler {
  if (!handler) handler = new TradeRequestHandler();
  return handler;
}

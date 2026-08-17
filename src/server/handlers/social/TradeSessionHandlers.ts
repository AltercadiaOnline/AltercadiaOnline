import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import type { TradeRequestPayload } from '../../../shared/social/tradeRequestProtocol.js';
import type {
  TradeCancelPayload,
  TradeLockPayload,
  TradeOfferSetPayload,
  TradeRespondPayload,
} from '../../../shared/social/playerTradeTypes.js';
import { getPlayerTradeStore } from '../../social/playerTradeStore.js';

function findWorld(playerId: string, characterId: number) {
  return getWorldGameState().getByPlayer(playerId, characterId);
}

export class TradeRequestHandler extends BaseIntentHandler<TradeRequestPayload> {
  readonly actionType = 'TRADE_REQUEST';

  async execute(playerId: string, payload: TradeRequestPayload, intentId: string): Promise<void> {
    const targetPlayerId = typeof payload.targetPlayerId === 'string' ? payload.targetPlayerId.trim() : '';
    const targetCharacterId = Number(payload.targetCharacterId);
    if (!targetPlayerId || !Number.isFinite(targetCharacterId) || targetCharacterId < 1) {
      this.sendResponse(playerId, intentId, false, 'Alvo de trade inválido.');
      return;
    }

    const fromWorld = findWorld(playerId, this.characterId);
    const toWorld = findWorld(targetPlayerId, targetCharacterId);
    if (!fromWorld) {
      this.sendResponse(playerId, intentId, false, 'Você precisa estar no mundo para pedir trade.');
      return;
    }
    if (!toWorld) {
      this.sendResponse(playerId, intentId, false, 'Jogador indisponível ou offline.');
      return;
    }

    const result = getPlayerTradeStore().createRequest(
      {
        connectionId: fromWorld.connectionId,
        playerId,
        characterId: this.characterId,
        displayName: fromWorld.displayName.trim() || 'Operative',
      },
      {
        connectionId: toWorld.connectionId,
        playerId: targetPlayerId,
        characterId: targetCharacterId,
        displayName: toWorld.displayName.trim() || 'Operative',
      },
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      tradeId: result.snapshot.tradeId,
      targetPlayerId,
      targetDisplayName: result.snapshot.to.displayName,
      message: `Pedido de trade enviado para ${result.snapshot.to.displayName}.`,
    });
  }
}

export class TradeRespondHandler extends BaseIntentHandler<TradeRespondPayload> {
  readonly actionType = 'TRADE_RESPOND';

  async execute(playerId: string, payload: TradeRespondPayload, intentId: string): Promise<void> {
    const tradeId = typeof payload.tradeId === 'string' ? payload.tradeId.trim() : '';
    if (!tradeId) {
      this.sendResponse(playerId, intentId, false, 'Pedido de trade inválido.');
      return;
    }
    const result = await getPlayerTradeStore().respond(playerId, this.characterId, tradeId, payload.accept === true);
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }
    this.sendResponse(playerId, intentId, true, {
      tradeId: result.snapshot.tradeId,
      accepted: payload.accept === true,
      phase: result.snapshot.phase,
      message: payload.accept === true ? 'Trade aceito.' : 'Trade recusado.',
    });
  }
}

export class TradeOfferSetHandler extends BaseIntentHandler<TradeOfferSetPayload> {
  readonly actionType = 'TRADE_OFFER_SET';

  async execute(playerId: string, payload: TradeOfferSetPayload, intentId: string): Promise<void> {
    const tradeId = typeof payload.tradeId === 'string' ? payload.tradeId.trim() : '';
    if (!tradeId) {
      this.sendResponse(playerId, intentId, false, 'Mesa de trade inválida.');
      return;
    }
    const result = await getPlayerTradeStore().setOffer(playerId, this.characterId, tradeId, {
      ...(payload.slotIndex !== undefined ? { slotIndex: payload.slotIndex } : {}),
      ...(payload.itemId !== undefined ? { itemId: payload.itemId } : {}),
      ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
      ...(payload.volts !== undefined ? { volts: payload.volts } : {}),
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }
    this.sendResponse(playerId, intentId, true, { tradeId: result.snapshot.tradeId });
  }
}

export class TradeLockHandler extends BaseIntentHandler<TradeLockPayload> {
  readonly actionType = 'TRADE_LOCK';

  async execute(playerId: string, payload: TradeLockPayload, intentId: string): Promise<void> {
    const tradeId = typeof payload.tradeId === 'string' ? payload.tradeId.trim() : '';
    if (!tradeId) {
      this.sendResponse(playerId, intentId, false, 'Mesa de trade inválida.');
      return;
    }
    const result = await getPlayerTradeStore().setReady(
      playerId,
      this.characterId,
      tradeId,
      payload.ready === true,
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }
    const message = result.snapshot.phase === 'committed'
      ? 'Troca concluída.'
      : payload.ready === true
        ? 'Oferta confirmada. Aguardando o outro jogador.'
        : 'Confirmação desfeita.';
    this.sendResponse(playerId, intentId, true, {
      tradeId: result.snapshot.tradeId,
      phase: result.snapshot.phase,
      message,
    });
  }
}

export class TradeCancelHandler extends BaseIntentHandler<TradeCancelPayload> {
  readonly actionType = 'TRADE_CANCEL';

  async execute(playerId: string, payload: TradeCancelPayload, intentId: string): Promise<void> {
    const tradeId = typeof payload.tradeId === 'string' ? payload.tradeId.trim() : '';
    if (!tradeId) {
      this.sendResponse(playerId, intentId, false, 'Mesa de trade inválida.');
      return;
    }
    const result = await getPlayerTradeStore().cancelByActor(playerId, this.characterId, tradeId);
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.reason);
      return;
    }
    this.sendResponse(playerId, intentId, true, {
      tradeId: result.snapshot.tradeId,
      message: 'Trade cancelado.',
    });
  }
}

let requestHandler: TradeRequestHandler | null = null;
let respondHandler: TradeRespondHandler | null = null;
let offerHandler: TradeOfferSetHandler | null = null;
let lockHandler: TradeLockHandler | null = null;
let cancelHandler: TradeCancelHandler | null = null;

export function getTradeRequestHandler(): TradeRequestHandler {
  requestHandler ??= new TradeRequestHandler();
  return requestHandler;
}

export function getTradeRespondHandler(): TradeRespondHandler {
  respondHandler ??= new TradeRespondHandler();
  return respondHandler;
}

export function getTradeOfferSetHandler(): TradeOfferSetHandler {
  offerHandler ??= new TradeOfferSetHandler();
  return offerHandler;
}

export function getTradeLockHandler(): TradeLockHandler {
  lockHandler ??= new TradeLockHandler();
  return lockHandler;
}

export function getTradeCancelHandler(): TradeCancelHandler {
  cancelHandler ??= new TradeCancelHandler();
  return cancelHandler;
}

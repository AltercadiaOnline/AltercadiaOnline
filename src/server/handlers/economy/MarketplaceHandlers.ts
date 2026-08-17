import {
  cancelMarketBuyOrderAuthoritative,
  cancelMarketListingAuthoritative,
  collectMarketVoltsAuthoritative,
  createMarketBuyOrderAuthoritative,
  createMarketListingAuthoritative,
  executeMarketPurchaseAuthoritative,
  queryMarketOrderBookAuthoritative,
} from '../../../Economy/marketplaceGateway.js';
import { persistCharacterSession } from '../../persistence/PersistenceGateway.js';
import { persistGlobalMarketplaceSnapshot } from '../../persistence/globalMarketplacePersistence.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

type MarketListingPayload = {
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly anonymous?: boolean;
};

type MarketListingIdPayload = {
  readonly listingId: string;
};

type MarketBuyOrderIdPayload = {
  readonly orderId: string;
};

type QueryMarketOrderBookPayload = {
  readonly itemId?: string | null;
};

function resolveQueryItemId(payload: QueryMarketOrderBookPayload): string | null {
  const itemId = typeof payload.itemId === 'string' ? payload.itemId.trim() : '';
  return itemId.length > 0 ? itemId : null;
}

export class QueryMarketOrderBookHandler extends BaseIntentHandler<QueryMarketOrderBookPayload> {
  readonly actionType = 'QUERY_MARKET_ORDER_BOOK';

  async execute(playerId: string, payload: QueryMarketOrderBookPayload, intentId: string): Promise<void> {
    const snapshot = queryMarketOrderBookAuthoritative(
      playerId,
      this.characterId,
      resolveQueryItemId(payload),
    );
    this.sendResponse(playerId, intentId, true, snapshot);
  }
}

export class CreateMarketListingHandler extends BaseIntentHandler<MarketListingPayload> {
  readonly actionType = 'CREATE_MARKET_LISTING';

  async execute(playerId: string, payload: MarketListingPayload, intentId: string): Promise<void> {
    const result = await createMarketListingAuthoritative(
      playerId,
      this.characterId,
      payload.itemId,
      payload.quantity,
      payload.unitPriceVolts,
      payload.anonymous ?? false,
      intentId,
    );
    if (result.ok) {
      await persistGlobalMarketplaceSnapshot();
    }
    this.sendResponse(
      playerId,
      intentId,
      result.ok,
      result.ok
        ? queryMarketOrderBookAuthoritative(playerId, this.characterId, payload.itemId)
        : result.message,
    );
  }
}

export class CreateMarketBuyOrderHandler extends BaseIntentHandler<MarketListingPayload> {
  readonly actionType = 'CREATE_MARKET_BUY_ORDER';

  async execute(playerId: string, payload: MarketListingPayload, intentId: string): Promise<void> {
    const result = await createMarketBuyOrderAuthoritative(
      playerId,
      this.characterId,
      payload.itemId,
      payload.quantity,
      payload.unitPriceVolts,
      payload.anonymous ?? false,
      intentId,
    );
    this.sendResponse(
      playerId,
      intentId,
      result.ok,
      result.ok
        ? queryMarketOrderBookAuthoritative(playerId, this.characterId, payload.itemId)
        : result.message,
    );
  }
}

export class CancelMarketListingHandler extends BaseIntentHandler<MarketListingIdPayload> {
  readonly actionType = 'CANCEL_MARKET_LISTING';

  async execute(playerId: string, payload: MarketListingIdPayload, intentId: string): Promise<void> {
    const result = await cancelMarketListingAuthoritative(
      playerId,
      this.characterId,
      payload.listingId,
      intentId,
    );
    if (result.ok) {
      await persistGlobalMarketplaceSnapshot();
    }
    this.sendResponse(
      playerId,
      intentId,
      result.ok,
      result.ok ? queryMarketOrderBookAuthoritative(playerId, this.characterId) : result.message,
    );
  }
}

export class CancelMarketBuyOrderHandler extends BaseIntentHandler<MarketBuyOrderIdPayload> {
  readonly actionType = 'CANCEL_MARKET_BUY_ORDER';

  async execute(playerId: string, payload: MarketBuyOrderIdPayload, intentId: string): Promise<void> {
    const result = await cancelMarketBuyOrderAuthoritative(
      playerId,
      this.characterId,
      payload.orderId,
      intentId,
    );
    this.sendResponse(
      playerId,
      intentId,
      result.ok,
      result.ok ? queryMarketOrderBookAuthoritative(playerId, this.characterId) : result.message,
    );
  }
}

export class CollectMarketVoltsHandler extends BaseIntentHandler<MarketListingIdPayload> {
  readonly actionType = 'COLLECT_MARKET_VOLTS';

  async execute(playerId: string, payload: MarketListingIdPayload, intentId: string): Promise<void> {
    const result = await collectMarketVoltsAuthoritative(
      playerId,
      this.characterId,
      payload.listingId,
      intentId,
    );
    this.sendResponse(
      playerId,
      intentId,
      result.ok,
      result.ok ? queryMarketOrderBookAuthoritative(playerId, this.characterId) : result.message,
    );
  }
}

export class ExecuteMarketPurchaseHandler extends BaseIntentHandler<MarketListingIdPayload> {
  readonly actionType = 'EXECUTE_MARKET_PURCHASE';

  async execute(playerId: string, payload: MarketListingIdPayload, intentId: string): Promise<void> {
    const result = await executeMarketPurchaseAuthoritative(
      playerId,
      this.characterId,
      payload.listingId,
      intentId,
    );

    if (result.ok) {
      await persistCharacterSession(playerId, this.characterId, {
        force: true,
        reason: 'marketplace',
      });
      await persistCharacterSession(result.sellerPlayerId, result.sellerCharacterId, {
        force: true,
        reason: 'marketplace',
      });
      await persistGlobalMarketplaceSnapshot();
    }

    this.sendResponse(
      playerId,
      intentId,
      result.ok,
      result.ok ? queryMarketOrderBookAuthoritative(playerId, this.characterId) : result.message,
    );
  }
}

let queryOrderBookHandler: QueryMarketOrderBookHandler | null = null;
let createListingHandler: CreateMarketListingHandler | null = null;
let createBuyOrderHandler: CreateMarketBuyOrderHandler | null = null;
let cancelListingHandler: CancelMarketListingHandler | null = null;
let cancelBuyOrderHandler: CancelMarketBuyOrderHandler | null = null;
let collectVoltsHandler: CollectMarketVoltsHandler | null = null;
let executePurchaseHandler: ExecuteMarketPurchaseHandler | null = null;

export function getQueryMarketOrderBookHandler(): QueryMarketOrderBookHandler {
  if (!queryOrderBookHandler) queryOrderBookHandler = new QueryMarketOrderBookHandler();
  return queryOrderBookHandler;
}

export function getCreateMarketListingHandler(): CreateMarketListingHandler {
  if (!createListingHandler) createListingHandler = new CreateMarketListingHandler();
  return createListingHandler;
}

export function getCreateMarketBuyOrderHandler(): CreateMarketBuyOrderHandler {
  if (!createBuyOrderHandler) createBuyOrderHandler = new CreateMarketBuyOrderHandler();
  return createBuyOrderHandler;
}

export function getCancelMarketListingHandler(): CancelMarketListingHandler {
  if (!cancelListingHandler) cancelListingHandler = new CancelMarketListingHandler();
  return cancelListingHandler;
}

export function getCancelMarketBuyOrderHandler(): CancelMarketBuyOrderHandler {
  if (!cancelBuyOrderHandler) cancelBuyOrderHandler = new CancelMarketBuyOrderHandler();
  return cancelBuyOrderHandler;
}

export function getCollectMarketVoltsHandler(): CollectMarketVoltsHandler {
  if (!collectVoltsHandler) collectVoltsHandler = new CollectMarketVoltsHandler();
  return collectVoltsHandler;
}

export function getExecuteMarketPurchaseHandler(): ExecuteMarketPurchaseHandler {
  if (!executePurchaseHandler) executePurchaseHandler = new ExecuteMarketPurchaseHandler();
  return executePurchaseHandler;
}

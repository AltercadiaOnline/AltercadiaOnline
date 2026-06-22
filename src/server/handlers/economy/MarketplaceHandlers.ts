import {
  cancelMarketBuyOrderAuthoritative,
  cancelMarketListingAuthoritative,
  collectMarketVoltsAuthoritative,
  createMarketBuyOrderAuthoritative,
  createMarketListingAuthoritative,
  executeMarketPurchaseAuthoritative,
} from '../../../Economy/marketplaceGateway.js';
import { persistCharacterSession } from '../../persistence/PersistenceGateway.js';
import { persistGlobalMarketplaceSnapshot } from '../../persistence/globalMarketplacePersistence.js';import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

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
    this.sendResponse(playerId, intentId, result.ok, result.ok ? undefined : result.message);
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
    this.sendResponse(playerId, intentId, result.ok, result.ok ? undefined : result.message);
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
    this.sendResponse(playerId, intentId, result.ok, result.ok ? undefined : result.message);
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
    this.sendResponse(playerId, intentId, result.ok, result.ok ? undefined : result.message);
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
    this.sendResponse(playerId, intentId, result.ok, result.ok ? undefined : result.message);
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
      await persistCharacterSession(playerId, this.characterId);
      await persistCharacterSession(result.sellerPlayerId, result.sellerCharacterId);
      await persistGlobalMarketplaceSnapshot();
    }

    this.sendResponse(playerId, intentId, result.ok, result.ok ? undefined : result.message);
  }
}

let createListingHandler: CreateMarketListingHandler | null = null;
let createBuyOrderHandler: CreateMarketBuyOrderHandler | null = null;
let cancelListingHandler: CancelMarketListingHandler | null = null;
let cancelBuyOrderHandler: CancelMarketBuyOrderHandler | null = null;
let collectVoltsHandler: CollectMarketVoltsHandler | null = null;
let executePurchaseHandler: ExecuteMarketPurchaseHandler | null = null;

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

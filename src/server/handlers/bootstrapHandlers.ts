import { registerIntentHandler } from '../network/intentHandlerRegistry.js';
import { getActivateBookHandler } from './economy/ActivateBookHandler.js';
import {
  getDepositBankCurrencyHandler,
  getDepositBankItemHandler,
  getWithdrawBankCurrencyHandler,
  getWithdrawBankItemHandler,
} from './economy/BankTransactionHandlers.js';
import { getExchangeAlterHandler } from './economy/ExchangeAlterHandler.js';
import { getHealAtNpcHandler } from './economy/HealAtNpcHandler.js';
import { getPurchaseNpcItemHandler } from './economy/PurchaseNpcItemHandler.js';
import { getSellNpcItemHandler } from './economy/SellNpcItemHandler.js';
import {
  getEquipFromInventoryHandler,
  getSyncLoadoutHandler,
  getUnequipToInventoryHandler,
} from './world/InteractionHandler.js';
import { getSyncMovesetHandler } from './world/SyncMovesetHandler.js';
import { getFeedPetHandler } from './pets/FeedPetHandler.js';
import { getPurchasePetHandler } from './pets/PurchasePetHandler.js';
import { getCraftItemHandler } from './crafting/CraftItemHandler.js';
import { getDeleteItemHandler } from './economy/DeleteItemHandler.js';
import { getCaelBuyPetRationHandler } from './economy/CaelBuyPetRationHandler.js';
import {
  getCancelMarketBuyOrderHandler,
  getCancelMarketListingHandler,
  getCollectMarketVoltsHandler,
  getCreateMarketBuyOrderHandler,
  getCreateMarketListingHandler,
  getExecuteMarketPurchaseHandler,
} from './economy/MarketplaceHandlers.js';
import { getPurchaseSkinHandler } from './economy/PurchaseSkinHandler.js';
import {
  getChooseMarcoHandler,
  getProgressMarcoHandler,
  getResetMarcoTrailHandler,
  getSelectMarcoBranchHandler,
} from './progression/marcoHandlers.js';

let bootstrapped = false;

function ensureHandlersRegistered(): void {
  if (bootstrapped) return;

  registerIntentHandler(getPurchaseNpcItemHandler());
  registerIntentHandler(getSellNpcItemHandler());
  registerIntentHandler(getHealAtNpcHandler());
  registerIntentHandler(getExchangeAlterHandler());
  registerIntentHandler(getActivateBookHandler());
  registerIntentHandler(getDepositBankItemHandler());
  registerIntentHandler(getWithdrawBankItemHandler());
  registerIntentHandler(getDepositBankCurrencyHandler());
  registerIntentHandler(getWithdrawBankCurrencyHandler());
  registerIntentHandler(getSyncLoadoutHandler());
  registerIntentHandler(getSyncMovesetHandler());
  registerIntentHandler(getEquipFromInventoryHandler());
  registerIntentHandler(getUnequipToInventoryHandler());
  registerIntentHandler(getPurchasePetHandler());
  registerIntentHandler(getFeedPetHandler());
  registerIntentHandler(getCraftItemHandler());
  registerIntentHandler(getCaelBuyPetRationHandler());
  registerIntentHandler(getDeleteItemHandler());
  registerIntentHandler(getCreateMarketListingHandler());
  registerIntentHandler(getCreateMarketBuyOrderHandler());
  registerIntentHandler(getCancelMarketListingHandler());
  registerIntentHandler(getCancelMarketBuyOrderHandler());
  registerIntentHandler(getCollectMarketVoltsHandler());
  registerIntentHandler(getExecuteMarketPurchaseHandler());
  registerIntentHandler(getPurchaseSkinHandler());
  registerIntentHandler(getSelectMarcoBranchHandler());
  registerIntentHandler(getChooseMarcoHandler());
  registerIntentHandler(getResetMarcoTrailHandler());
  registerIntentHandler(getProgressMarcoHandler());

  bootstrapped = true;
}

/** Registra todos os handlers — chamar no startup do servidor. */
export function bootstrapIntentHandlers(): void {
  ensureHandlersRegistered();
}

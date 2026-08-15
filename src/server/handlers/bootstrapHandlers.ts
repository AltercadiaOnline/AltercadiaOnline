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
import {
  getPetActivateSlotHandler,
  getPetApplyAffectionHandler,
  getPetDeactivateHandler,
  getPetSelectSlotHandler,
} from './pets/PetRosterHandlers.js';
import { getCraftItemHandler } from './crafting/CraftItemHandler.js';
import { getDeleteItemHandler } from './economy/DeleteItemHandler.js';
import { getCaelBuyPetRationHandler } from './economy/CaelBuyPetRationHandler.js';
import { getGiftTransferHandler } from './economy/GiftTransferHandler.js';
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
  getCollectBattleLootHandler,
  getDismissBattleLootHandler,
} from './combat/BattleLootHandlers.js';
import {
  getRefractionBoothCompleteHandler,
  getRefractionBoothQuoteHandler,
  getRefractionBoothStartHandler,
} from './city/RefractionBoothHandlers.js';
import {
  getChooseMarcoHandler,
  getProgressMarcoHandler,
  getResetMarcoTrailHandler,
  getSelectMarcoBranchHandler,
} from './progression/marcoHandlers.js';
import {
  getDevGrantCurrencyHandler,
  getDevGrantItemHandler,
  getDevResetPlayerHandler,
  getDevSetLevelHandler,
  getDevSetMovesetMasteryHandler,
} from './dev/DevCheatHandlers.js';
import { getChatGlobalSendHandler } from './social/ChatGlobalSendHandler.js';
import { getTradeRequestHandler } from './social/TradeRequestHandler.js';
import { getZoneEnsureHandler } from './world/ZoneEnsureHandler.js';

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
  registerIntentHandler(getZoneEnsureHandler());
  registerIntentHandler(getEquipFromInventoryHandler());
  registerIntentHandler(getUnequipToInventoryHandler());
  registerIntentHandler(getPurchasePetHandler());
  registerIntentHandler(getFeedPetHandler());
  registerIntentHandler(getPetSelectSlotHandler());
  registerIntentHandler(getPetActivateSlotHandler());
  registerIntentHandler(getPetDeactivateHandler());
  registerIntentHandler(getPetApplyAffectionHandler());
  registerIntentHandler(getCraftItemHandler());
  registerIntentHandler(getCaelBuyPetRationHandler());
  registerIntentHandler(getDeleteItemHandler());
  registerIntentHandler(getGiftTransferHandler());
  registerIntentHandler(getCollectBattleLootHandler());
  registerIntentHandler(getDismissBattleLootHandler());
  registerIntentHandler(getRefractionBoothQuoteHandler());
  registerIntentHandler(getRefractionBoothStartHandler());
  registerIntentHandler(getRefractionBoothCompleteHandler());
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
  registerIntentHandler(getDevGrantItemHandler());
  registerIntentHandler(getDevGrantCurrencyHandler());
  registerIntentHandler(getDevSetLevelHandler());
  registerIntentHandler(getDevSetMovesetMasteryHandler());
  registerIntentHandler(getDevResetPlayerHandler());
  registerIntentHandler(getChatGlobalSendHandler());
  registerIntentHandler(getTradeRequestHandler());

  bootstrapped = true;
}

/** Registra todos os handlers — chamar no startup do servidor. */
export function bootstrapIntentHandlers(): void {
  ensureHandlersRegistered();
}

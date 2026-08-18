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
  getQueryMarketOrderBookHandler,
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
import { getChatWhisperHandler } from './social/ChatWhisperHandler.js';
import { getTradeRequestHandler } from './social/TradeRequestHandler.js';
import {
  getTradeCancelHandler,
  getTradeLockHandler,
  getTradeOfferSetHandler,
  getTradeRespondHandler,
} from './social/TradeSessionHandlers.js';
import { getPlaceSprayHandler } from './social/PlaceSprayHandler.js';
import { getInspectSprayHandler } from './social/InspectSprayHandler.js';
import { getUpdateSprayLegacyHandler } from './social/UpdateSprayLegacyHandler.js';
import { getAddFriendHandler } from './social/AddFriendHandler.js';
import { getInspectPlayerHandler } from './social/InspectPlayerHandler.js';
import { getDuelInviteHandler } from './social/DuelInviteHandler.js';
import { getDuelInviteRespondHandler } from './social/DuelInviteRespondHandler.js';
import {
  getStaticFlexReactHandler,
  getStaticFlexSetHeadlineHandler,
  getStaticSabotageContributeHandler,
  getStaticWarRoomJoinHandler,
  getStaticWarRoomLeaveHandler,
  getStaticWarRoomLockHandler,
  getStaticWarRoomOpenHandler,
} from './static/staticContractHandlers.js';
import { getZoneEnsureHandler } from './world/ZoneEnsureHandler.js';
import { getGetLeaderboardHandler } from './world/GetLeaderboardHandler.js';
import {
  getAbandonMercenaryQuestHandler,
  getAcceptMercenaryQuestHandler,
} from './world/MercenaryQuestHandlers.js';

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
  registerIntentHandler(getGetLeaderboardHandler());
  registerIntentHandler(getAcceptMercenaryQuestHandler());
  registerIntentHandler(getAbandonMercenaryQuestHandler());
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
  registerIntentHandler(getQueryMarketOrderBookHandler());
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
  registerIntentHandler(getChatWhisperHandler());
  registerIntentHandler(getTradeRequestHandler());
  registerIntentHandler(getTradeRespondHandler());
  registerIntentHandler(getTradeOfferSetHandler());
  registerIntentHandler(getTradeLockHandler());
  registerIntentHandler(getTradeCancelHandler());
  registerIntentHandler(getPlaceSprayHandler());
  registerIntentHandler(getInspectSprayHandler());
  registerIntentHandler(getUpdateSprayLegacyHandler());
  registerIntentHandler(getAddFriendHandler());
  registerIntentHandler(getInspectPlayerHandler());
  registerIntentHandler(getDuelInviteHandler());
  registerIntentHandler(getDuelInviteRespondHandler());
  registerIntentHandler(getStaticSabotageContributeHandler());
  registerIntentHandler(getStaticWarRoomOpenHandler());
  registerIntentHandler(getStaticWarRoomJoinHandler());
  registerIntentHandler(getStaticWarRoomLeaveHandler());
  registerIntentHandler(getStaticWarRoomLockHandler());
  registerIntentHandler(getStaticFlexReactHandler());
  registerIntentHandler(getStaticFlexSetHeadlineHandler());

  bootstrapped = true;
}

/** Registra todos os handlers — chamar no startup do servidor. */
export function bootstrapIntentHandlers(): void {
  ensureHandlersRegistered();
}

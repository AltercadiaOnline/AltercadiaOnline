import { registerIntentHandler } from '../network/intentHandlerRegistry.js';
import { getExchangeAlterHandler } from './economy/ExchangeAlterHandler.js';
import { getHealAtNpcHandler } from './economy/HealAtNpcHandler.js';
import { getPurchaseNpcItemHandler } from './economy/PurchaseNpcItemHandler.js';
import { getSellNpcItemHandler } from './economy/SellNpcItemHandler.js';
import {
  getEquipFromInventoryHandler,
  getSyncLoadoutHandler,
  getUnequipToInventoryHandler,
} from './world/InteractionHandler.js';
import { getFeedPetHandler } from './pets/FeedPetHandler.js';
import { getPurchasePetHandler } from './pets/PurchasePetHandler.js';
import { getCraftItemHandler } from './crafting/CraftItemHandler.js';
import { getCaelBuyPetRationHandler } from './economy/CaelBuyPetRationHandler.js';

let bootstrapped = false;

function ensureHandlersRegistered(): void {
  if (bootstrapped) return;

  registerIntentHandler(getPurchaseNpcItemHandler());
  registerIntentHandler(getSellNpcItemHandler());
  registerIntentHandler(getHealAtNpcHandler());
  registerIntentHandler(getExchangeAlterHandler());
  registerIntentHandler(getSyncLoadoutHandler());
  registerIntentHandler(getEquipFromInventoryHandler());
  registerIntentHandler(getUnequipToInventoryHandler());
  registerIntentHandler(getPurchasePetHandler());
  registerIntentHandler(getFeedPetHandler());
  registerIntentHandler(getCraftItemHandler());
  registerIntentHandler(getCaelBuyPetRationHandler());

  bootstrapped = true;
}

/** Registra todos os handlers — chamar no startup do servidor. */
export function bootstrapIntentHandlers(): void {
  ensureHandlersRegistered();
}

/** @deprecated Use bootstrapIntentHandlers */
export const bootstrapTransactionHandlers = bootstrapIntentHandlers;

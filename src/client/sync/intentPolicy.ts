import type { ActionDispatcherMode, ClientAction } from '../ActionDispatcher.js';
import { allowsOfflineGameplayFallback } from '../runtime/onlineFirstPolicy.js';

export type { ActionDispatcherMode };

export type IntentConfirmationPolicy = 'waitForServer' | 'optimisticLocal';

const WAIT_FOR_SERVER: IntentConfirmationPolicy = 'waitForServer';
const OPTIMISTIC_LOCAL: IntentConfirmationPolicy = 'optimisticLocal';

/** Mensagem padrão quando a UI tenta mutar estado sem servidor. */
export const SERVER_AUTHORITY_REQUIRED_MESSAGE =
  'Esta ação requer conexão com o servidor. Aguarde a sincronização ou reconecte.';

/** Mutações locais (heal, pet, market, wallet) — apenas localhost + mock/local. */
export function canApplyLocalGameplayMutations(mode: ActionDispatcherMode): boolean {
  if (!allowsOfflineGameplayFallback()) return false;
  return mode === 'mock' || mode === 'local';
}

/** Ações de loja NPC / pet / cura — candidatas a mutação local offline. */
export function isVendorClientAction(action: ClientAction): boolean {

  switch (action.type) {

    case 'PURCHASE_PET':

    case 'PURCHASE_NPC_ITEM':

    case 'SELL_NPC_ITEM':

    case 'HEAL_AT_NPC':

    case 'CAEL_BUY_PET_RATION':

    case 'PET_FEED_SPECIAL_RATION':

      return true;

    default:

      return false;

  }

}



/**

 * Online: sempre false — vendor/heal/pet devem usar player-intent + state-sync (P0).

 * Mock/local: true para ações de vendor (simulação otimista).

 */

export function isClientAuthoritativeVendorAction(

  action: ClientAction,

  mode: ActionDispatcherMode,

): boolean {

  if (mode === 'online') {

    return false;

  }

  return isVendorClientAction(action);

}



export function resolveIntentPolicy(

  action: ClientAction,

  mode: ActionDispatcherMode,

): IntentConfirmationPolicy {

  if (mode === 'local' || mode === 'mock') return OPTIMISTIC_LOCAL;

  if (isClientAuthoritativeVendorAction(action, mode)) return OPTIMISTIC_LOCAL;

  return WAIT_FOR_SERVER;

}



export function shouldWaitForServer(action: ClientAction, mode: ActionDispatcherMode): boolean {

  return resolveIntentPolicy(action, mode) === WAIT_FOR_SERVER;

}



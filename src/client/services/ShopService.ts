import { findNpcVendorListing } from '../../shared/economy/npcVendorCatalog.js';

import { validateNpcPurchase } from '../../shared/economy/npcVendorService.js';

import { ANCIAO_CAEL_NPC_ID } from '../../shared/economy/caelPetService.js';

import { getMutableDataStore } from '../PlayerDataStore.js';



export type ShopBuyResult =

  | { readonly ok: true; readonly message: string }

  | { readonly ok: false; readonly reason: string };



/**

 * Compras em lojas NPC — valida catálogo e executa transação local autoritativa.

 */

export const ShopService = {

  buy(itemId: string, vendorId = ANCIAO_CAEL_NPC_ID): ShopBuyResult {

    const listing = findNpcVendorListing(vendorId, itemId);

    if (!listing) {

      return { ok: false, reason: `Item "${itemId}" indisponível nesta loja.` };

    }



    const wallet = getMutableDataStore().getWallet();

    const validation = validateNpcPurchase({

      listing,

      quantity: 1,

      walletVolts: wallet.dollarVolt,

    });

    if (!validation.ok) return validation;



    return { ok: false, reason: `Compra de "${itemId}" ainda não suportada neste serviço.` };

  },

} as const;


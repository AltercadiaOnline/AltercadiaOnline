import {
  seedDemoProfileIfEmpty,
  seedPlayerWalletIfEmpty,
  syncDemoProfileInventoryIfIncomplete,
} from '../../Economy/economyStore.js';

export type AuthoritativeEconomySeed = {
  readonly dollarVolt?: number;
  readonly alterCoins?: number;
};

/**
 * Zero Trust — único ponto no servidor autorizado a popular moedas/inventário
 * no runtime (`economyStore`). Nunca importar no cliente.
 */
export function seedAuthoritativePlayerEconomyIfEmpty(
  playerId: string,
  characterId: number,
  seed: AuthoritativeEconomySeed = { dollarVolt: 1200, alterCoins: 50 },
): void {
  seedPlayerWalletIfEmpty(playerId, seed);
  seedDemoProfileIfEmpty(playerId, characterId);
  syncDemoProfileInventoryIfIncomplete(playerId, characterId);
}

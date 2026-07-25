import {
  ensureAuthoritativePlayerEconomyEmpty,
} from '../../Economy/economyStore.js';

/**
 * Personagem limpo — garante carteira/inventário em memória sem itens nem moedas.
 * Não injeta DEMO_STARTER nem VOLTS de teste.
 * Nunca importar no cliente.
 */
export function seedAuthoritativePlayerEconomyIfEmpty(
  playerId: string,
  characterId: number,
  _seed?: { readonly dollarVolt?: number; readonly alterCoins?: number },
): void {
  ensureAuthoritativePlayerEconomyEmpty(playerId, characterId);
}

/** Alias explícito — preferir este nome em código novo. */
export const ensureAuthoritativePlayerEconomyIfEmpty = seedAuthoritativePlayerEconomyIfEmpty;

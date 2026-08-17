# Economia (itens, moedas, loja, banco, market)

Única mutação de inventário/carteira no servidor: `src/Economy/economyGateway.ts` dentro de transação atômica.

## Arquivos âncora

| Peça | Path |
|------|------|
| Gateway | `src/Economy/economyGateway.ts` |
| Store runtime | `src/Economy/economyStore.ts` |
| Catálogo | `src/shared/items/itemCatalog.ts` |
| Preço servidor | handlers em `src/server/handlers/economy/` + `src/shared/economy/ShopManager.ts` |
| Banco | `BankTransactionHandlers.ts`, `src/shared/bank/` |
| Market | `MarketplaceHandlers.ts`, `globalMarketplaceStore.ts` |
| Trade P2P | `playerTradeStore.ts` + `commitAuthoritativePlayerTrade` (tx dois personagens) |
| Craft | `src/server/handlers/crafting/CraftItemHandler.ts` |
| Loot pendente | `src/Economy/pendingLootStore.ts` — fluxo de vitória: [combate-pve.md](combate-pve.md) |
| Mock local | `src/client/testing/MockEconomyService.ts` |
| Ícones | `public/assets/items/{catalogId}.png` — `npm run sync:item-icons` |

## Regras

- Cliente **exibe** `price-check-response` / snapshot. Não soma taxa/margem no front.
- Trade presencial: snapshot só tem `itemId` + qty + VOLTS. Ícone/nome = catálogo. Reserva (`lockedQuantity`) no offer; commit atômico nos dois lados.
- Market: anunciar/comprar/cancelar compensam se a tx de inventário/carteira falhar (anúncio volta ao book). Só quantidade **livre** (não locked de trade) entra no anúncio.
- Gift P2P: `commitAuthoritativeGiftTransfer` (tx dois personagens no `economyStore`). Destinatário precisa estar hidratado no mundo. Sem RPC SQL paralelo.
- SET / `SYNC_LOADOUT` online: cliente manda proposta; inventário/equip só mudam após `InventoryUpdated`. Sem mutação otimista. Snapshot de combate ignora SET do cliente.
- Divergência de preço → bloquear + erro de integridade, não enviar intent.
- Personagem novo: inventário vazio (`initializePlayerState`). Sem seed demo.
- Debug/cheats: `DEV_*` via ActionDispatcher, não `store.x =`.

## Painéis React

`WorldInventoryPanel`, `WorldShopPanel`, `WorldVendorShopPanel`, `WorldBankPanel`, `WorldMarketPanel`, `WorldCraftPanel`, `WorldLaboratoryShopPanel`.

## Isolamento

Economy não importa estado interno de Combat. Combat pede loot/XP por serviço, não furando `economyStore` de outro módulo no cliente.

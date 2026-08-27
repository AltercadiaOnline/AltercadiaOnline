# Economia (itens, moedas, loja, banco, market)

Única mutação de inventário/carteira no servidor: `src/Economy/economyGateway.ts` dentro de transação atômica.

## Arquivos âncora

| Peça | Path |
|------|------|
| Gateway | `src/Economy/economyGateway.ts` |
| Store runtime | `src/Economy/economyStore.ts` |
| Catálogo | `src/shared/items/itemCatalog.ts` |
| Preço de drop (farm) | `src/shared/economy/dropItemValor.ts` — piso por zona × tipo × raridade |
| Preço servidor | handlers em `src/server/handlers/economy/` + `src/shared/economy/ShopManager.ts` |
| Banco | `BankTransactionHandlers.ts`, `src/shared/bank/` |
| Market (global) | `MarketplaceHandlers.ts`, `globalMarketplaceStore.ts`, `globalMarketplacePersistence.ts` |
| Persist market | `data/account/global-marketplace.json` — [persistencia.md](persistencia.md) |
| Trade P2P | `playerTradeStore.ts` + `commitAuthoritativePlayerTrade` (tx dois personagens) |
| Craft | `src/server/handlers/crafting/CraftItemHandler.ts` |
| Loot pendente | `src/Economy/pendingLootStore.ts` — fluxo de vitória: [combate-pve.md](combate-pve.md) |
| Mock local | `src/client/testing/MockEconomyService.ts` |
| Ícones | `public/assets/items/{catalogId}.png` — `npm run sync:item-icons` |

## Dono dos itens (regra fechada)

Inventário, VOLTS, banco do personagem e settle de market/trade/gift pertencem ao **`characterId`**, não à conta (`userId`).

```text
conta (login / e-mail)
  ├─ characterId A  → inventário A  (isolado)
  └─ characterId B  → inventário B  (isolado)
       ✗ A ⇄ B  — sem transferência entre slots da mesma conta
```

- Pasta `data/account/` = organização de ficheiros (`{userId}/{characterId}.json`). **Não** é vault compartilhado entre slots.
- Cada personagem pode hopar para qualquer mundo livre; os itens **desse** char vão com ele. Hop: [personagem-mundos.md](personagem-mundos.md).

### Proibido — mesma conta

Qualquer canal que mova item/VOLTS entre dois `characterId` com o **mesmo** `userId`:

| Canal | Regra |
|-------|--------|
| Marketplace | Recusar compra/settle se `seller.userId === buyer.userId` |
| Trade presencial | Recusar se os dois lados são da mesma conta |
| Gift P2P | Recusar se destinatário é da mesma conta |
| Atalhos / bank “compartilhado” / mule | Não existem — cada slot é baú próprio |

Autoridade no servidor (`economyGateway` / handlers). Cliente só espelha o erro.

## Marketplace global (regra fechada)

Book **único entre mundos** (não por shard). Settle sempre no inventário do **`characterId`** que opera.

```text
char A em Azul / Esmerald / Platino / Tronum
        ↓ anuncia / compra / cancela
  um único book global (todos os mundos)
        ↓ settle
  inventário + carteira do characterId A (nunca outro slot da conta)
```

| | Escopo |
|--|--------|
| Book / listagens / escrow | **Global** — `globalMarketplaceStore` + `data/account/global-marketplace.json` |
| Quem vê e opera | Qualquer mundo onde **esse** char estiver logado (mesmo book) |
| Inventário / VOLTS no settle | Só o `characterId` da operação — não vault da conta, não `SERVER_ID` |
| Mundo (`SERVER_ID`) | Só sessão / WS / cena — **nunca** filtro do market |

**Contrato**

- Anunciar, comprar e cancelar usam o **mesmo** book em todos os mundos.
- Compra feita noutro shard entrega o item no inventário do **comprador** (`characterId` dele) no mundo em que ele está.
- Compensação: se a tx de inventário/carteira falhar, o anúncio volta ao book.
- Só quantidade **livre** (não `lockedQuantity` de trade) entra no anúncio.
- Compra same-account (alt mule via market) → **recusar** (tabela acima).

**Proibido**

- Filtrar listagens, escrow ou settle por `serverId` / `SERVER_ID` do processo.
- Persistência do book em `data/{serverId}/…` (legado a promover para account-scoped path, nunca reintroduzir shard).
- Marketplace “local do Azul” ou book separado por Railway sem volume/SQL compartilhado.
- Tratar hop de mundo como motivo para esconder, invalidar ou duplicar anúncios.
- Usar o market (ou gift/trade) para mover itens entre personagens da mesma conta.

Hop / identidade: [personagem-mundos.md](personagem-mundos.md).

## Regras

- Cliente **exibe** `price-check-response` / snapshot. Não soma taxa/margem no front.
- Trade presencial: snapshot só tem `itemId` + qty + VOLTS. Ícone/nome = catálogo. Reserva (`lockedQuantity`) no offer; commit atômico nos dois lados. Mesmo mundo (presença). **Bloquear same-account.** Market = global (acima).
- Gift P2P: `commitAuthoritativeGiftTransfer` (tx dois personagens no `economyStore`). Destinatário hidratado no mundo. **Bloquear same-account.** Sem RPC SQL paralelo.
- PVP púlpito 1x1: aposta só via `lockPvpRankedDuelStake` / `settlePvpRankedDuelStake` no gateway. HUD da fila não calcula o pote.
- SET / `SYNC_LOADOUT` online: cliente manda proposta; inventário/equip só mudam após `InventoryUpdated`. Sem mutação otimista. Snapshot de combate ignora SET do cliente.
- Divergência de preço → bloquear + erro de integridade, não enviar intent.
- Personagem novo: inventário vazio (`initializePlayerState`). Sem seed demo.
- Debug/cheats: `DEV_*` via ActionDispatcher, não `store.x =`.

## Painéis React

`WorldInventoryPanel`, `WorldShopPanel`, `WorldVendorShopPanel`, `WorldBankPanel`, `WorldMarketPanel`, `WorldCraftPanel`, `WorldLaboratoryShopPanel`.

## Isolamento

Economy não importa estado interno de Combat. Combat pede loot/XP por serviço, não furando `economyStore` de outro módulo no cliente.

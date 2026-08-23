# Personagem × mundos (hop estilo RuneScape)

Regra de produto: o **characterId** é um personagem da conta (slot). O servidor (Azul, Esmerald, Platino, Tronum) é só **em qual instância esse char está jogando agora**. Itens são do **personagem**, não da conta.

```text
login → escolhe slot (characterId) → escolhe mundo livre → WS daquele mundo
identidade = characterId + classe + nome + slot
full-state-sync = ESTADO desse char (viaja) — itens, VOLTS, pets…
marketplace = book GLOBAL entre mundos; settle no characterId que opera
mundo vivo = players, criaturas, púlpito, spray no chão (não viaja)
✗ sem transferir itens entre personagens da mesma conta (gift / trade / market)
```

Uma fatia por chat. Cole **esta** ficha. Não abrir identidade + persistência + login juntas.

**Estado da migração:** fase **2** (save da conta em `{DATA_DIR}/account`). Hub e hop ainda não. Só Azul jogável.

## Hoje (código)

| Peça | Comportamento |
|------|----------------|
| Identidade | `serverId` imutável no slot (`characterIdentity.ts`) — até fase 4 |
| Hub | `listProfilesForUserOnServer` filtra `profiles.server_id` = `SERVER_ID` do processo — até fase 3 |
| `world-login` | `WRONG_SERVER` se payload.serverId ≠ processo — até fase 4 |
| Save file | Path account-scoped: `data/account/characters/{userId}/{characterId}.json` = **um ficheiro por personagem** (não vault compartilhado). **mundo:** `data/{serverId}/` (spray, static) |
| Marketplace | Book **global entre mundos**; inventário no settle = `characterId`. Sem compra same-account — [economia.md](economia.md) |
| Catálogo | `azul`, `vermelho`, `roxo` — só Azul selecionável |
| SQL | PK `(user_id, character_id, server_id)` em currency / inventory / pets — até fase 7 |

## Alvo

| | Identidade | Sessão (este hop) |
|--|------------|-------------------|
| Fica | `characterId`, `classId`, `displayName`, `slotIndex` | mundo atual (`azul` / `esmerald` / …) |
| Não é identidade | — | `lastWorldId` (estado, último hop) |

- 5 slots **por conta**, não por mundo — cada slot = inventário **próprio**.
- `characterId` **não recicla** no delete.
- Um char **não** loga em dois mundos ao mesmo tempo (kick / recusa).
- Create **não** pede servidor.
- **Hop livre:** o mesmo `characterId` pode entrar em qualquer mundo livre (quando o hop estiver ligado). Mundo ≠ dono do inventário.

### Itens = personagem (não conta)

```text
conta
  ├─ char A → baú A
  └─ char B → baú B
char A hop Azul → Esmerald → leva baú A
char B nunca recebe itens de A (gift / trade / market same-account = recusar)
```

Economia / canais bloqueados: [economia.md](economia.md) § Dono dos itens.

### Viaja com o char

itens, volts, XP, pets, marcos, skin, rating (se global), pose se o mapa existir no destino — **só desse `characterId`**.

**Marketplace (book global entre mundos):** anúncios/compra/cancel **não** ficam presos ao `SERVER_ID`. Settle no inventário do char que opera. Detalhe: [economia.md](economia.md) § Marketplace global.

```text
char A anuncia no Azul → listing no book global
char A hop → Esmerald → vê/opera o mesmo book (ainda baú A)
settle compra → itens/VOLTS no characterId do comprador
compra char B (mesmo userId) de listing do char A → RECUSAR
```

### Fica no mundo (instância)

players online, criaturas, púlpito / fila PvP, spray no chão (`world_sprays.server_id` **permanece**).

**Não** fica no mundo: marketplace (book global). Trade presencial / gift exigem presença no mesmo mundo **e** contas diferentes.

## Arquivos âncora

| Peça | Path |
|------|------|
| Identidade | `src/shared/character/characterIdentity.ts` |
| Escopo shard (hoje) | `src/shared/supabase/characterServerScope.ts` |
| Catálogo mundos | `src/shared/world/serverInstanceCatalog.ts` |
| Hub | `src/server/net/characterHubService.ts`, `characterHubRepository.ts` |
| Login WS | `CombatWsHub.ts` `world-login` |
| Save | `PersistenceGateway.ts`, `FileStorage.ts` |
| SQL tipos | `src/shared/supabase/gameDatabaseTypes.ts` |

Login/UI: [login.md](login.md). Identidade de classe: [identidade.md](identidade.md). File vs stub SQL: [persistencia.md](persistencia.md).

## Fases (um PR por vez)

Critério de pronto no hop: **o mesmo `characterId` entra em dois mundos com o mesmo inventário, e nunca nos dois ao mesmo tempo.**

| Fase | O quê | Critério de teste | Ainda não |
|------|--------|-------------------|-----------|
| **0** | Regras desta ficha (congeladas) | Time alinhado | Código |
| **1** | Inventário de dados: `profiles` / currency com `server_id` ≠ `azul`; save canônico = Azul | Sem duplicata `(user, character)` em dois shards | Hub global |
| **2** | Save chave `(userId, characterId)`. `SERVER_ID` = processo, não dono do char. Spray de chão continua por mundo | Azul: login → farm → relog = mesmo inventário. Delete não recicla ID | 2º Railway, postgres |
| **3** | Hub lista todos os chars da conta. `server_id` na profile = `last_world_id` | Mesmo e-mail, mesmos slots, mesmo se o processo mudar em staging | Hop jogável |
| **4** | Identidade sem `serverId`. `world-login`: JWT + char da conta. Lock de sessão. `WRONG_SERVER` só host/mundo errado | 2 browsers, mesmo char → segundo não entra. Cogitor permanece Cogitor | UI de hop |
| **5** | Char select: slot **depois** mundo (`GET /api/servers`). Mundos extra = “em breve” | Fluxo Azul inalterado para o jogador | Catálogo novo ligado |
| **6** | Catálogo `azul` / `esmerald` / `platino` / `tronum`. 2º mundo só com **save compartilhado** (volume único ou SQL real) | Hop Azul → outro → Azul, volts iguais, sem duplicar | 4 mundos de uma vez |
| **7** | SQL: unique `(user_id, character_id)` em currency/inventory/pets. `world_sprays.server_id` fica | Staging com SQL, sem perder Azul | Ligar `PERSISTENCE_MODE=postgres` no stub |

## Proibido

- Hub global **antes** da fase 3 (ainda filtra `profiles.server_id` = processo).
- Quatro Railways com `data/` separado e chamar de hop.
- Marketplace por shard / filtro de listagem por `serverId` / book em `data/{serverId}/` — market é **global entre mundos**; itens do **characterId**.
- Transferir itens/VOLTS entre personagens da **mesma conta** (gift, trade presencial, compra no market, bank compartilhado, mule).
- Tratar `data/account/` como inventário único da conta — é path de ficheiro; dono = `characterId`.
- Um PR com catálogo + identidade + SQL + UI.
- Ligar `PERSISTENCE_MODE=postgres` enquanto o storage for stub.
- Reciclar `characterId`. Inferir classe `IMPETUS` no enter-world.
- Tirar `serverId` de `CharacterIdentity` **antes** da fase 4.

## Como pedir no chat

```text
módulo personagem-mundos — fase 3 hub global da conta
@docs/context/personagem-mundos.md
```

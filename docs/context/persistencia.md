# Persistência

Produção/dev atual: **`PERSISTENCE_MODE=file`**. PostgresStorage é **stub** — `initializePersistence` **bloqueia** `postgres`.

## O que grava o quê

| Dado | Onde |
|------|------|
| Personagem (inv, XP, perfil, pets, legado, amigos) | `FileStorage` — `data/account/characters/{userId}/{characterId}.json` = **um baú por `characterId`** (path “account” ≠ vault compartilhado). Legado `data/azul/characters/` promovido na leitura. [personagem-mundos.md](personagem-mundos.md) fase 2 |
| Loot pendente / seq de ID | `data/account/pending-loot.json` e `_id-seq.json` na pasta do jogador |
| Marketplace global | `data/account/global-marketplace.json` (promove raiz/`data/azul/`). Book **único entre mundos**; settle no `characterId`; sem same-account. [economia.md](economia.md) |
| Sprays do mundo | `data/{serverId}/world-sprays.json` (promove raiz `data/`) |
| Static network | `data/{serverId}/static-network.json` |
| Leaderboard | `data/{serverId}/leaderboard.json` — `leaderboardFilePersistence.ts` |
| Local (`GAME_MODE=local` / `npm run dev:mock`) | `src/client/persistence/localCharacterSave.ts` (mesmo schema, localStorage) |

Schema: `src/shared/persistence/characterPersistenceRecord.ts`  
Gateway: `src/server/persistence/PersistenceGateway.ts`  
Snapshot online: `buildAuthoritativeSnapshot.ts` → `full-state-sync`  
I/O atômico: `DatabaseUtils.ts` (temp + rename)

## Login

`hydrateCharacterSession` → seed **só** personagem novo → `full-state-sync`. Cliente nunca é SSOT.

## `legacyMessage`

Campo em `characterProfile`. Inspect de spray lê do perfil autoritativo, não do tile.

## Não fazer

- Ligar `PERSISTENCE_MODE=postgres` até existir CRUD real
- Hub global / hop **antes** das fases 3–6 — o save da conta já é `(userId, characterId)` em `data/account/` — [personagem-mundos.md](personagem-mundos.md)
- Commitar `data/`, `dist/`, `.env`
- Calcular progresso no cliente e “salvar depois”

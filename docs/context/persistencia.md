# Persistência

Produção/dev atual: **`PERSISTENCE_MODE=file`**. PostgresStorage é **stub** — `initializePersistence` **bloqueia** `postgres`.

## O que grava o quê

| Dado | Onde |
|------|------|
| Personagem (inv, XP, perfil, pets, legado, amigos) | `src/server/persistence/` + `CharacterPersistenceRecord` |
| Sprays do mundo | `worldSprayPersistence.ts` → `data/{shard}/world-sprays.json` |
| Leaderboard | `src/server/leaderboard/leaderboardFilePersistence.ts` |
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
- Commitar `data/`, `dist/`, `.env`
- Calcular progresso no cliente e “salvar depois”

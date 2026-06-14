# MVP Online — estrutura de teste

Guia para validar o monólito online (HTTP + WebSocket `/ws`) com **persistência em arquivo** antes de Postgres/Supabase server-side.

## Modos de persistência

| `PERSISTENCE_MODE` | Uso |
|--------------------|-----|
| `memory` (default) | Dev rápido — **reinício zera** economia/mundo/loot pendente |
| `file` | **MVP online QA** — JSON em `DATA_DIR` (default `./data`) |

Variáveis (`.env` ou Vercel):

```env
PERSISTENCE_MODE=file
DATA_DIR=./data
```

> `data/` está no `.gitignore` — não commitar saves locais.

## Layout no disco (`PERSISTENCE_MODE=file`)

```text
data/
  characters/
    {playerId encoded}/
      {characterId}.json    ← economia, mundo, progressão, marcos
  pending-loot.json           ← loot staged (cassino) até coletar/dismiss
```

## Módulos (arquitetura)

| Camada | Path | Responsabilidade |
|--------|------|------------------|
| Contrato | `src/shared/persistence/characterPersistenceRecord.ts` | Schema JSON v1 |
| Config | `src/shared/persistence/persistenceConfig.ts` | `memory` / `file` |
| I/O atômico | `src/server/persistence/DatabaseUtils.ts` | write temp + rename |
| Gateway | `src/server/persistence/PersistenceGateway.ts` | load/save personagem + loot pendente |
| Snapshot WS | `src/server/persistence/buildAuthoritativeSnapshot.ts` | `full-state-sync` |
| Progressão server | `src/server/progression/authoritativeProgressionStore.ts` | marcos/mastery autoritativo |
| Bootstrap | `src/server/persistence/initializePersistence.ts` | startup + flush SIGTERM |

**Regra:** mutações continuam só via `economyGateway` / `PositionGateway`. Persistência **grava** estado já validado — não recalcula recompensas.

## Fluxo online (smoke test)

1. **Subir servidor file mode**
   ```bash
   set PERSISTENCE_MODE=file
   npm run dev
   ```

2. **Login mundo** — cliente envia `world-login` → servidor:
   - `hydrateCharacterSession` (lê JSON se existir)
   - ou seed demo + `persistCharacterSession` (personagem novo)
   - responde `world-login-result` + **`full-state-sync`**

3. **Reconnect** — `request-full-state` → `full-state-sync` (HUD repovoa via `GlobalStateSynchronizer`)

4. **Batalha PVE**
   - XP: automático (módulo `battleProgressionGrant`) — *wire pendente*
   - Loot: `BATTLE_LOOT_PACKAGE` → cassino → `combat-confirm-loot`
   - Loot pendente salvo em `pending-loot.json`

5. **Redeploy / restart**
   - Mesmo `playerId` + `characterId` → inventário/wallet/mapa restaurados

6. **Coleta parcial** — inventário cheio: o que couber entra; excedente perdido (decisão B)

## Checklist QA

- [ ] `world-login` restaura posição no mapa após restart
- [ ] Wallet/inventário/banco iguais após restart
- [ ] Loot pendente sobrevive restart **antes** de coletar
- [ ] `request-full-state` após F5 repovoa HUD
- [ ] Desconectar WS grava personagem (`persistCharacterSession`)
- [ ] `PERSISTENCE_MODE=memory` não cria pasta `data/`

## Próximas camadas (fora deste MVP file)

1. `SessionGateway` — validar JWT Supabase no `world-login`
2. `player-intent` handler — marcos/equip online
3. Postgres via `DatabaseUtils.executeTransaction` (substituir JSON)
4. Aplicar `battleProgressionGrant` no fim da batalha (servidor → stores)

## Validação manual

Use o checklist QA acima e `npm run deploy:check` antes de deploy.

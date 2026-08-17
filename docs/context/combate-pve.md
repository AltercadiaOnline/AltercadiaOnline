# Combate PVE (XP + loot)

Sessão vs criatura. Motor / HUD: [combate.md](combate.md). Itens/moeda depois do Coletar: [economia.md](economia.md).

## Arquivos âncora

| Peça | Path |
|------|------|
| Sessão | `src/server/combat/CombatSession.ts` |
| Montagem | `src/server/combat/buildPveBattle.ts` |
| Kill credit | `src/server/combat/applyAuthoritativePveKillCredit.ts` |
| Fim + grant | `finalizeAuthoritativeBattleEnd.ts` + `applyAuthoritativeBattleProgression.ts` |
| XP split | `src/shared/combat/battleXpRewards.ts` + `src/shared/progression/battleProgressionGrant.ts` |
| Loot | `src/Economy/pendingLootStore.ts` + `src/server/handlers/combat/BattleLootHandlers.ts` |
| Cliente cassino | `src/client/ui/battle/battleLootCasinoFlow.ts` |

## Produto fechado (não reabrir)

| Canal | Quando | Se sair sem ação |
|-------|--------|------------------|
| XP / marcos progressão | automático na vitória PVE | já no perfil |
| Loot cassino | só após **Coletar** | perde (`dismissBattleLootOnServer`) |
| Loot vazio | botão Recompensas ainda existe | anima “nenhum drop” |

Marcos de árvore (habilidade) ≠ loot. Trilha lenta: [progressao-pets-quests.md](progressao-pets-quests.md).

## Proibido

Calcular XP no cliente. Passar progressão pelo `economyGateway`. Tratar fila PvP / rating nesta ficha — isso é [combate-pvp.md](combate-pvp.md).

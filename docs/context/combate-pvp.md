# Combate PVP (fila + match)

Púlpito 1x1 na cidade. Motor / HUD de batalha: [combate.md](combate.md). Placar ao vivo: [ranking.md](ranking.md).

Sem cassino de loot de criatura neste fluxo.

## Arquivos âncora

| Peça | Path |
|------|------|
| Contrato fila | `src/shared/combat/pvp/pvpRankedQueueConfig.ts` |
| Fila | `src/server/combat/pvp/PvpRankedQueueManager.ts` |
| Sessão rankeada | `src/server/combat/pvp/RankedPvpCombatSession.ts` |
| Duelista | `src/server/combat/pvp/buildPvpDuelistCombatant.ts` |
| Fim + rating | `src/server/combat/finalizeAuthoritativeRankedPvpEnd.ts` |
| WS | `pvp-ranked-join` / leave / ready + snapshot em `src/shared/wsProtocol.ts` |
| HUD fila | `WorldPvpQueuePanel.tsx`, `pvpQueueStore.ts`, `pvpRankedQueueBridge.ts` |
| Local | `src/client/combat/local/localPvpRankedAuthority.ts` |

Marker Construct / `npcId`: `combate_pvp` (`PVP_RANKED_STATION_ID`). Catálogo: `worldTerminalCatalog.ts` (`pvp_queue`). Dois slots, aceite mútuo, countdown **10s** (`PVP_RANKED_ACCEPT_COUNTDOWN_MS`) — cliente só espelha.

NPC `computador_arena` = monitor de ranking, **não** a fila.

Duelo **casual** (HUD do player, convite Aceitar/Recusar, countdown 5s, sem rating, cancela se afastar) ≠ este púlpito. Intents `DUEL_INVITE` / `DUEL_INVITE_RESPOND`.

## Save

`pvpRating`, `pvpWins`, `pvpLosses`, `pvpMatches` no record de persistência. Cliente não calcula rating.

## Proibido

Inventar match no front. Abrir loot cassino PVE nesta ficha. Escrever leaderboard via `economyGateway`.

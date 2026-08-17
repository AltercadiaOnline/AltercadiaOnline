# Ranking / leaderboard

Placar ao vivo (arena / computador). Não mistura com XP de combate nem com economia.

## Arquivos âncora

| Peça | Path |
|------|------|
| Tipos | `src/shared/leaderboard/leaderboardTypes.ts` |
| Memória | `src/server/leaderboard/leaderboardMemoryStore.ts` |
| File | `src/server/leaderboard/leaderboardFilePersistence.ts` |
| Upsert | `upsertLeaderboardFromProgression.ts` |
| HTTP | `src/server/net/leaderboardRoute.ts` (`GET /api/leaderboard`) |
| Intent | `GetLeaderboardHandler.ts` |
| Fetch cliente | `src/client/leaderboard/fetchLeaderboard.ts` |
| Hook | `src/client/app/hooks/useLiveLeaderboard.ts` |
| Painel | `WorldRankingMonitorPanel.tsx` |

NPC `computador_arena` abre o monitor. Fila PvP é outro POI — [combate-pvp.md](combate-pvp.md).

## Regras

- Snapshot vem do servidor. Cliente faz poll / intent e **desenha**.
- Persistência atual = file (mesmo modo do save). Não inventar rank no Zustand.
- XP/nível que alimenta o board: [progressao-pets-quests.md](progressao-pets-quests.md).

## Proibido

Calcular posição no ranking no front. Escrever leaderboard via `economyGateway`.

# Ranking / leaderboard

Dois canais distintos. Não misturar.

| Superfície | Conteúdo |
|------------|----------|
| **Login / site** (`AuthScreen`) | Vitrine: level, classe, moveset, PvP, PvE |
| **`computador_arena` (cidade 01)** | Só **PvP ranqueado** — estrutura + board `pvp_ranked` |
| **`combate_pvp` (púlpito)** | Fila 1x1 — [combate-pvp.md](combate-pvp.md) |

PvP casual / batalha normal **não** alimenta nem aparece no PC da Arena.

## Arquivos âncora

| Peça | Path |
|------|------|
| Tipos | `src/shared/leaderboard/leaderboardTypes.ts` |
| Memória | `src/server/leaderboard/leaderboardMemoryStore.ts` |
| File | `src/server/leaderboard/leaderboardFilePersistence.ts` → `data/{serverId}/leaderboard.json` |
| Upsert | `upsertLeaderboardFromProgression.ts` |
| HTTP | `src/server/net/leaderboardRoute.ts` (`GET /api/leaderboard`) |
| Intent | `GetLeaderboardHandler.ts` |
| Fetch cliente | `src/client/leaderboard/fetchLeaderboard.ts` |
| Hook | `src/client/app/hooks/useLiveLeaderboard.ts` |
| Arena PC | `WorldRankingMonitorPanel.tsx` + `useRankingMonitorPanelState.ts` (fixixo `pvp_ranked`) |
| Login vitrine | `AuthScreen.tsx` (`AUTH_RANK_TABS`) |

## Regras

- Snapshot vem do servidor. Cliente faz poll / intent e **desenha**.
- Arena: sem abas level / moveset / PvE.
- Board ranqueado: mínimo `PVP_RANKED_LEADERBOARD_MIN_MATCHES` duelos.
- Persistência atual = file. Não inventar rank no Zustand.
- XP/nível que alimenta boards de progressão: [progressao-pets-quests.md](progressao-pets-quests.md) — só na vitrine do login.

## Proibido

Calcular posição no ranking no front. Escrever leaderboard via `economyGateway`.
Mostrar ranks gerais no `computador_arena`.

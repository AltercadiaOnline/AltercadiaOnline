# Progressão, pets, missões

## Marcos / trilha

- Servidor: `src/server/progression/authoritativeProgressionStore.ts`
- Handlers: `src/server/handlers/progression/marcoHandlers.ts`
- Motor árvore: `src/shared/progression/marcoProgressEngine.ts`
- Painel: `WorldMarcosPanel.tsx`
- `milestoneTotalProgress` +1 por vitória PVE (lento). Habilidades de marco ≠ loot. Grant de batalha: [combate-pve.md](combate-pve.md).

## Pets

- Handlers: `src/server/handlers/pets/`
- Economy stores: `petRosterStore.ts`, `petAffinityStore.ts`
- Overlay: `PetFollowEntity.ts`
- Painéis: `WorldPetLovePanel`, `WorldPetTrainerShopPanel`, `WorldPetMemorialPanel`
- Compra/feed/slot = intents (`PURCHASE_PET`, `PET_*`)

## Quadro de Agente (mercenário)

- Shared catálogo: `src/shared/quests/mercenaryQuestCatalog.ts`
- Server: `src/server/quests/mercenaryQuestStore.ts` + `MercenaryQuestHandlers.ts`
- UI: `MercenaryQuestBoard.tsx`, `useMercenaryQuestBoard.ts`

## Leaderboard

Ficha [ranking.md](ranking.md). Aqui só: XP/nível alimentam o board; o painel não calcula rank.

## PVP fila

Ficha [combate-pvp.md](combate-pvp.md). Aqui não.

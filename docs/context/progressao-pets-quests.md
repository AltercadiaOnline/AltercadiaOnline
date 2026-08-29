# Progressão, pets, missões

## Domínio de moveset

Curva piecewise em `CharacterProgressionService.resolveDomainRequiredXp` (não a do personagem).

| Fase | Domínio | Ritmo |
|------|---------|--------|
| Early–mid | 1→50 | barato — moveset sobe **na frente** do nível |
| Mid | 50→70 | médio |
| Late | 70→85 | caro |
| End | 85→99 | muro |

Âncoras alvo (main move, loadout ~4): char ~30 → domínio ~50; char ~50 → ~65; char ~100 → ~85.  
Teto: `MOVE_MASTERY_CAP_FACTOR = 2` (`moveMasteryCap.ts`) — char 30 pode investir até domínio 60.  
Grant: [combate-pve.md](combate-pve.md) / [combate-pvp.md](combate-pvp.md).

## Bolsa de atributos (Ficha)

Cada nível concede **2 pontos**. O jogador gasta na Ficha (`WorldCharactersPanel`) em ATK (+1), DEF (+1) ou Vida (+8 na base). Classe só dá o start (Impetus 6/4, Cogitor 5/5, Tutator 4/6, Dissolutus 4/6). ATK/DEF **não** sobem sozinhos com o nível.

- Contrato: `src/shared/character/characterStatPoints.ts`
- Intent: `ALLOCATE_STAT_POINTS` → `src/server/handlers/progression/allocateStatPointsHandler.ts`
- Persistência: `allocatedAtk` / `allocatedDef` / `allocatedHp` no profile; bolsa = `(nível − 1) × 2 − gastos`
- ACK: só `intent-result` (não passar `intentId` em `syncWorldVitalsHpMaxFromLoadout` — evita race com `WorldVitalsUpdated`)
- Combate: linha `ficha` no breakdown, **depois** dos % de SET

Marcos / pets / missões abaixo. Não misturar pontos da Ficha com a árvore de marcos.

## Marcos / trilha

- Servidor: `src/server/progression/authoritativeProgressionStore.ts`
- Handlers: `src/server/handlers/progression/marcoHandlers.ts`
- Motor árvore: `src/shared/progression/marcoProgressEngine.ts`
- Painel: `WorldMarcosPanel.tsx`
- `milestoneTotalProgress` — **legado / congelado** (não sobe mais em batalha; árvore não depende dele). Habilidades de marco ≠ loot. Grant de batalha: [combate-pve.md](combate-pve.md) / PvP [combate-pvp.md](combate-pvp.md).

**Como obter degrau:** trilha confirmada + nó anterior ◆ + personagem no Nv. mínimo daquele degrau (10 / 30 / 50 / 70 / 100). Clique no ○ — não no ◆ já ativo. Nvl. da habilidade (barra de XP) sobe em combate; o % da HUD é o valor *agora*, não o teto do Nvl.5.

## Pets

- Handlers: `src/server/handlers/pets/`
- Economy stores: `petRosterStore.ts`, `petAffinityStore.ts`
- Overlay: `PetFollowEntity.ts`
- Painéis: `WorldPetLovePanel`, `WorldPetTrainerShopPanel`, `WorldPetMemorialPanel`
- Compra/feed/slot = intents (`PURCHASE_PET`, `PET_*`)

## Quadro de Agente (mercenário)

**Piloto (MVP):** Aceitar no NPC → Hub mostra tracker → voltar ao Mercenário → **Completar** → XP + VOLTS.

| Decisão | Valor |
|---------|--------|
| Entrega | Só no NPC (sem passo no mundo ainda) |
| Abandono | Livre (pode reassinar) |
| Reward | XP + VOLTS (`rewardExp` / `rewardVolts`) |
| Rep / item / moral branch | Fora do piloto (flavor / campos dormem) |
| Faixas | 1–10 / 11–20 / 21–30. Unlock: completar as 5 do tier anterior (não por nível). |

Catálogo HUD já usa o cronograma (títulos/lore/objetivo). Passos no mundo ainda não. Checklist em [mercenary-quests-cronograma.md](mercenary-quests-cronograma.md) — **Fase 0** depois **Q1…Q15**.

- Shared: `mercenaryQuestCatalog.ts`, `mercenaryQuestProgress.ts` (`completeMercenaryQuest`)
- Server: `MercenaryQuestHandlers.ts` + `creditMercenaryQuestVolts` (economyGateway)
- UI: `MercenaryQuestBoard.tsx`, `useMercenaryQuestBoard.ts`
- Intents: `ACCEPT_MERCENARY_TASK` / `ABANDON_MERCENARY_TASK` / `COMPLETE_MERCENARY_TASK`

## Leaderboard

Ficha [ranking.md](ranking.md). Aqui só: XP/nível alimentam o board; o painel não calcula rank.

## PVP fila

Ficha [combate-pvp.md](combate-pvp.md). Aqui não.

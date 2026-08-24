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
| Aposta 1x1 | `pvpRankedDuelStake.ts` + `lockPvpRankedDuelStake` / `settlePvpRankedDuelStake` |
| WS | `pvp-ranked-join` / leave / ready / set-stake + snapshot em `src/shared/wsProtocol.ts` |
| HUD fila | `WorldPvpQueuePanel.tsx`, `pvpQueueStore.ts`, `pvpRankedQueueBridge.ts` |
| Local | `src/client/combat/local/localPvpRankedAuthority.ts` |

Marker Construct / `npcId`: `combate_pvp` (`PVP_RANKED_STATION_ID`). Catálogo: `worldTerminalCatalog.ts` (`pvp_queue`). Dois slots; cada um escolhe aposta (≥50 V) e **trava**; os dois travados → countdown **10s**. Cancelar / sair **esvazia os dois slots**. Sem bot.

NPC `computador_arena` = HUD **só** PvP ranqueado (estrutura + board `pvp_ranked`), **não** a fila e **não** ranks de nível/moveset/PvE (esses ficam no login).

Duelo **casual / card** (botão direito → ficha → **Convidar para uma batalha**): Aceitar/Recusar, cancelar no pending ou no countdown **5s**, alcance **3 tiles**, timeout **15s**, cooldown **2 min** após recusa (mesmo desafiante→alvo), sem rating/aposta; bloqueado se trade / púlpito / batalha / ocupado / **HP ≤ 0** (`casualDuelHpGate`). Ficha **sempre mostra** `duelInviteBlockReason` sob o botão; se bloqueado o botão vira **Atualizar desafio** (re-inspect + notificação — não usa `disabled` HTML). Após `DUEL_INVITE` OK a ficha fecha; HUD Aceitar/Aguardando = DOM (`casualDuelDomHud.ts`, match por `playerId`+`characterId`). **Derrota casual** (morte real, não FORFEIT): mesma política PVE — ~10% HP + respawn cidade (`casualPvp` em `battleWorldRestorePolicy`). FORFEIT mantém HP da luta. Intents `DUEL_INVITE` / `DUEL_INVITE_RESPOND`. Entry único = ficha do player. Ficha mostra **Build** (ATK/DEF/CRIT/AGIL sem SET) + **PvP ranqueado** (pontos/W/L/partidas), não espelha equipamento.

**Arena PvP (casual/rankeado):** layout espelhado (eu esquerda / oponente direita); sprites por **`skinBundleId`** (`bindPvpDuel` — ally `east`, foe `west`; mundo hoje, `battle/` futuro). Altura canônica = **`player_male_1`** (`battlePvpSkinDrawScale.ts`); skins provisórias usam `drawScale` >1 + `footPadRatio` (descem o PNG até o chão). Pet se equipado; timer + dano PvP via enrich / resolveAttackTargetId.

### Progressão PvP (produto fechado)

| Item | Regra |
|------|--------|
| Onde | Casual + ranked (sem bot) |
| Loot | Nunca (sem cassino) |
| Vitória | 100% do pool |
| Derrota KO | 40% do pool **já nerfado** do vencedor |
| FORFEIT / DC | Ninguém ganha XP |
| Pool | `15 + nívelOponente × 10` (mesma curva zona PVE) |
| Nerf | Se self > oponente: linear, Δ20 → ×0.5, Δ40 → ×0 |
| Split | Mesmo ritmo PVE (nível + domínio); sem medidor de marco |
| UI | Hub pós-duelo mostra +XP; sem botão Recompensas |

Fim: `finalizeAuthoritativeRankedPvpEnd` + `resolvePvpBattleProgressionGrant` / `battlePvpXpPool.ts`.

### Ciclo battle ↔ mundo (obrigatório)

| Momento | Contrato |
|---------|----------|
| `START_COMBAT` | Cliente: `rememberBattleEnterContext` + `onBattleEnterClient` (fecha ficha/convite, limpa remotes). Arena mount `pvp` **não** chama `bindPlayer`/`bindMonster`. |
| Em batalha | `WorldGameState.status = battle` — peer some do `nearbyPlayers`. |
| Fim PVP rankeado | Servidor: `restoreWorldPeersAfterRankedPvp` → `exploring` na **mesma pose** do perfil. Cliente: **não** teleporta para a cidade (`shouldCityRespawnAfterBattle` = false). |
| Fim PVP casual (derrota) | Teleporte cidade + vitals PVE (~10% HP), via `casualPvp` no payload / policy. Vitória / FORFEIT: restaura no local. |
| Fantasma | Proibido: cliente na cidade + servidor no duelo. |

Política: `src/shared/combat/battleWorldRestorePolicy.ts` · lifecycle cliente: `src/client/combat/battleWorldLifecycle.ts` · restore server: `src/server/combat/pvp/restoreWorldAfterRankedPvp.ts`.

## Aposta 1x1 (pote)

Cada um escolhe o próprio valor (**50–10.000** V; sem 0). O servidor **trava** no “Travar aposta”. Os dois travados → countdown. Sair / cancelar / DC **antes** da luta **devolve** e tira os dois do púlpito. No KO/DC **durante** a luta o vencedor leva o pote (`soma`) menos **5%** da casa (arredondamento ao inteiro mais próximo). Empate de HP: último golpe ganha. Cliente só espelha `stakeVolts` / `potVolts`.

Fim rankeado: HP/MP de **antes** da luta; mesma pose no púlpito.

## Save

`pvpRating` = pontos (+1 / −1, piso 0), `pvpWins`, `pvpLosses`, `pvpMatches`. Cliente não calcula o placar.

## Proibido

Inventar match no front. Abrir loot cassino PVE nesta ficha. Escrever leaderboard via `economyGateway`.

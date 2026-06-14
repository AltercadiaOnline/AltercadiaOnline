# Cidade 01 — Minigames urbanos (escopo v1.0)

**Versão 1.0 | Maio 2026**

> Estande de tiro e pesca de fragmentos existem **só na cidade** para dar loop de lazer fora do combate. **Não** alteram stats de batalha, marcos ou dash. A **arena social** (espectador + apostas) é módulo separado — ver `MODULO-ATIVIDADES-CIDADE-v1.0.md` e extensão espectador abaixo.

---

## 01 — Divisão de sistemas

| Sistema | Onde | Objetivo | Recompensa |
|---------|------|----------|------------|
| **Arena social** | POI arena + púlpitos + anel espectador | Apostas, torneio, assistir duelo, plateia | VOLTS via `economyGateway` |
| **Minigames cidade** | POIs dedicados em Cidade 01 | Diversão, skill local, ranking social | VOLTS modestos, placar local, itens cosméticos/crafting leve (opcional) |
| **Combate** | Motor `CombatEngine` | Loop principal tático | PH, loot, progressão |

Regra de ouro: minigame **nunca** escreve em `combatStats`, `marcoCombatFlags` ou cooldown de skills.

---

## 02 — Simulador de Refração (estande VORTEX)

### Lore (superfície)

Cabine de treinamento corporativo; alvos holográficos simulam “assinatura” de criaturas dimensionais. Marca VORTEX visível no cenário — narrativa, sem revelar dreno da barreira.

### Gameplay MVP

- Interação em POI `vortex_refraction_booth` (tile fixo na Cidade 01).
- Sessão **solo**, duração ~30–60s.
- Alvos aparecem em sequência (posição + timing); cliente envia `hits` / `misses` / `sessionId`.
- Servidor valida score (anti-bot: intervalo mínimo entre hits, teto de score, 1 sessão a cada N minutos).

### Recompensas (só cidade)

- Pequeno pagamento em **VOLTS** por faixa de score (tabela fixa, teto diário).
- **Placar local** na parede do estande (`RefractionLeaderboardSnapshot` — top 10 semanal).
- Sem “Pontos de Precisão” que afetem combate.

### Pós-MVP (opcional)

- Skins de alvo / moldura de placar desbloqueáveis por score acumulado.

---

## 03 — Pesca de fragmentos (sintonização)

### Lore (superfície)

Em tiles de **fissura** (beco / subsolo no mapa), operativos usam dispositivo de sintonização para “pescar” cristal instável antes de dissipar.

### Gameplay MVP

- POI `fissure_sync_spot` (1–3 tiles na Cidade 01 no MVP).
- Minigame **ritmo ou janela de precisão** (uma mecânica só no v1).
- Servidor sorteia sucesso/falha com seed + skill do jogador; falha = sem loot, mensagem de “instabilidade”.
- **Solo** no MVP; coop em v1.1 (contador de participantes na instância, sem afetar combate).

### Recompensas (só cidade)

- Item genérico de cidade/crafting (ex. `fragment_shard` — valor baixo, não o fragmento lore principal).
- VOLTS simbólicos em streak de sucesso.
- Sem buff de combate; sem aumento de drop em batalha.

### Pós-MVP

- Sintonização em grupo (mais rápido, mais chance de falha por instabilidade — só loot de cidade).

---

## 04 — Arena social (pós-MVP — ideia futura)

**Fora do escopo do MVP atual.** Documentado para não perder o desenho:

- **Telão (MVP futuro):** painel/janela com `BattleScreen` em modo só leitura; jogador permanece em exploração na Cidade 01; subscribe ao `battleId` do duelo na arena. Telão 3D no mapa = decoração opcional + mesmo painel ao clicar.
- **Apostas de terceiros:** depois do telão.
- **Torneio / púlpitos:** já no mapa (`OPEN_TOURNAMENT_BET`) — alinhar com `cityActivities` quando priorizado.
- **Torcer/vaiar:** fase posterior.

Integração prevista: `cityActivities` + `economyGateway` + duelo arena público no servidor.

---

## 05 — Integração técnica (minigames)

| Peça | Path sugerido |
|------|----------------|
| IDs e regras | `src/shared/cityMinigames/cityMinigamesConfig.ts` |
| Tipos / intents | `src/shared/cityMinigames/cityMinigamesTypes.ts` |
| Resolver score (puro) | `src/shared/cityMinigames/resolveMinigameScore.ts` |
| Eventos | `src/shared/cityMinigames/events.ts` → EventBus |
| Servidor | `src/server/city/CityMinigameService.ts` |
| Economia | `economyGateway` para VOLTS / grant de item |
| Cliente HUD | `src/client/ui/city/` (cabine + fissura) |
| POIs mapa | `city01LayoutConstants.ts` + `npcRegistry` ou `InteractiveEntity` |

### Fluxo autoritativo

1. Jogador interage no POI → cliente abre HUD minigame (canvas/DOM leve).
2. Ao terminar → `ActionRequest` / WS `city-minigame-complete` com payload mínimo.
3. Servidor recalcula score, aplica cooldown, liquida recompensa, emite snapshot + `COMBAT_LOG` opcional na cidade.
4. Cliente atualiza wallet/inventário só via snapshot/gateway.

---

## 06 — POIs MVP (Cidade 01)

| ID | Tipo | Notas |
|----|------|-------|
| `vortex_refraction_booth` | Minigame | Perto da arena ou bloco comercial |
| `fissure_sync_spot_01` | Minigame | Beco / tile marcado visualmente |
| `arena_spectator_terminal` | Arena social | Tiles do anel espectador |
| `arena_pulpit_*` | Arena social | Já no mapa |

---

## 07 — Fora do escopo v1.0

- Bônus de dash, crit ou marcos vindos de minigame.
- Minigames em outros mapas (só Cidade 01).
- PvP dentro do minigame.
- Ranking global de conta (só placar local/cidade no MVP).

---

*Mundo Alternado | Minigames = lazer urbano | Arena = economia social*

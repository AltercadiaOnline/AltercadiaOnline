# Torre de Poder (raid MVP)

Raid por shard: farm de **itens, dinheiro, fama** (+ buff de XP de nível).  
Contrato **fechado**. **MVP online jogável** (solo end-to-end): mapas, PC, party, Liberar, enter floor, ativador→combate, clear/next/leave, restore gate, buff XP, fama, ranking.  
Gaps: BattleScreen compartilhada multi-player; mock/local; loot table própria; markers Construct `leave`/`next_level` (alguns coords ruins — fallback no generate).

Combate: [combate.md](combate.md) · PVE loot: [combate-pve.md](combate-pve.md) · Mundo: [mundo.md](mundo.md) · Intents: [intents-gateway.md](intents-gateway.md).

---

## Premissa fechada

| Decisão | Valor |
|---------|--------|
| Motivo de entrar | Itens, dinheiro, **fama** (principal), buff XP de nível |
| Escopo | **1 torre por `serverId`** |
| Nível mínimo | **10** |
| Party | **1–4**, classes **livres** (pode repetir) |
| Solo | **Permitido** |
| Boss escala | Sempre **como time de 4** (heroico se incompleto) |
| Combate | Só **BattleScreen** (Construct = mapa / markers) |
| Hall (`tower_gate`) | **Público** (todo mundo se vê, igual cidade) |
| Andares 1–N | **Instância privada por party** |
| Limite de runs | MVP **sem** limite (anti-farm depois) |
| PVP / lobby 15 / Isolation Pull social | **Fase 2** — fora do MVP |

---

## Fluxo do jogador

```text
city_01 (direita)
  └─ city_portal_towerpower
       └─ tower_gate (layout: entradatorredopoder)     ← PÚBLICO
            ├─ computador_towerpower
            │     party + Pronto + Liberar entrada
            │     ranking: máx. andar + vezes vencidas (pessoal + top shard)
            ├─ spawn (enter_spaw / spaw_enter)         ← abre 5 min após Liberar
            └─ andares privados
                 tower_floor_1 … tower_floor_5 (MVP)
                 → futuro 6–10; leave no 10 igual ao 5
```

### Computador + entrada

1. Monta time / Pronto no PC → pode **fechar HUD e andar** no hall.
2. Líder (ou solo) → **Liberar entrada** (botão no PC).
3. Spawn abre **5 min** só pra esse time; quem não entrar fica de fora.
4. Primeiro que entra cria instância privada; resto do time vai pro mesmo lugar.
5. No andar: `ativador_boss` → party sobe pro BattleScreen.

### Progressão na run

| Evento | Efeito |
|--------|--------|
| Vitória no boss | Volta ao **mesmo andar**; `next_level` libera |
| Morte | Jogador → **entrada** (`tower_gate`); vivos continuam; **sem rejoin** na run |
| Abandonar mid-run | **Proibido** — só morte ou leave no checkpoint |
| Leave | Só **após matar** boss do checkpoint (**5, 10, …**) → volta ao **gate** |

---

## Construct ↔ mapId

| Layout Construct | `mapId` | Papel |
|------------------|---------|--------|
| `cidade_01` | `city_01` | Portal `city_portal_towerpower` |
| `entradatorredopoder` | `tower_gate` | Hall público + PC + spawn |
| `andar_1_torre_poder` | `tower_floor_1` | Andar 1 |
| `andar_2_torre_poder` | `tower_floor_2` | Andar 2 |
| `andar_3_torre_poder` | `tower_floor_3` | Andar 3 |
| `andar_4_torre_poder2` | `tower_floor_4` | Andar 4 |
| `andar_5_torre_poder3` | `tower_floor_5` | Andar 5 + `leave_level_*` |

### Markers

| ObjectType | Papel |
|------------|--------|
| `city_portal_towerpower` | Portal cidade → gate |
| `computador_towerpower` | Terminal party / liberar / ranking |
| `enter_spaw_towerpower` / `spaw_enter_towerpower` | Spawn raid (alias; unificar depois) |
| `torre_do_poder` | Prop visual |
| `ativador_boss` | Qualquer um da party interage → BattleScreen |
| `spawn_boss_tower_power` | Âncora / “mais perto do boss” |
| `next_level_power_tower` | Portal N→N+1 (só pós-clear) |
| `leave_level_power_tower2` | Evacuate no checkpoint (pós-boss) |

Assets boss: `public/assets/creatures/boss_tower_power/` (`floor_01` … `floor_05`).

**Proibido no Construct:** timer, party, unlock, combate, BattleScreen via eventsheet.

---

## Recompensas

| Canal | Quando | Quem |
|-------|--------|------|
| Loot boss (itens/dinheiro) | Opt-in **Coletar** (estilo criatura; pool própria) | Só **vivos** na BattleScreen |
| Buff XP nível | Na **saída** (leave **ou** morte) | `+10% × andares completados` por **1h** |
| Fama | Só no **leave** do checkpoint | Só quem **usou o leave** |

### Buff XP — regras

- Ex.: chegou no 3 sem matar o 3 → andares 1–2 ok → **+20% / 1h**.
- Checkpoint 5 completo → **+50% / 1h**.
- Reentrar **não** acumula sozinho; só **andar novo** completado soma %; **não reinicia** o timer (usa hora restante).

### Ranking no PC

- Pessoal + top shard: **máx. andar alcançado** + **vezes que venceu esse andar**.

---

## Força dos bosses

```text
stats = âncora(Zona2 @ nv10) × mult_andar_1 × (r ^ (andar-1)) × escala_party_4
```

| Âncora | Valor |
|--------|--------|
| Base | Criatura **Zona 2 @ nível 10** (não Z1) |
| Andar 1 | ~**8× HP**, ~**4× ATK/DEF** (+ mecânicas) — duro pra 4× nv10 |
| Curva | **Exponencial**; `r` no balance |
| Alvo muro | Andar **5** = **4× nv40 sofrem** |
| Futuro | 6–10 mesma lógica; muro no **10** |

Escala/party e mecânicas: **só servidor**. Cliente não calcula poder.

SSOT: `src/shared/tower/towerPowerScaling.ts`.

---

## Bosses — entrada + estilo (MVP 1–5)

| Andar | Entrada | Combate |
|------:|---------|---------|
| **1** | Queda → cantos → puxa **mais perto do boss** → **2 turnos solo** | Tank reto; a cada **3** ataques do boss → **40% hit duplo** (2 hits no turno). Puxado morre nos solo → entrada; resto continua |
| **2** | 1 **marcado** (aleatório) — boss só nele 2 turnos; 1 **travado** (aleatório outro) — entra após **4** turnos. Solo: sem moveset nos **2** primeiros turnos dele | Controle (viés quem buffou / mais recurso; escolha aleatória) |
| **3** | Todos entram **já com status** (kit **aleatório por jogador**) | DoT / status |
| **4** | Sem prólogo especial | Enrage degraus **75% / 50% / 25%** HP → ↑ ATK e DEF |
| **5** | Solo **1 turno** (mais perto) + status aleatório na entrada | Mistura: hit duplo + controle + enrage 75/50/25 |

Catálogo: `src/shared/tower/towerBossCatalog.ts`.

---

## Intents (Gateway)

Handlers em `src/server/handlers/tower/`. UI: `ActionGatewayButton` + pending.

| Intent | Função |
|--------|--------|
| `TOWER_PARTY_CREATE` / `INVITE` / `RESPOND` / `LEAVE` / `READY` | Monta time no PC |
| `TOWER_UNLOCK_ENTRY` | Líder/solo libera spawn (inicia 5 min) |
| `TOWER_ENTER_FLOOR` | Entra no spawn → instância privada (valida unlock + timer + nv10) |
| `TOWER_ACTIVATE_BOSS` | Ativador → inicia `tower_pve_squad` |
| `TOWER_ASCEND` | `next_level` pós-clear |
| `TOWER_EVACUATE` | Leave no checkpoint pós-boss → gate + fama + buff |

Portal cidade↔gate pode reusar portal world existente + marker.

Proibido: mutar party / moeda / XP / fama / buff no cliente.

---

## Combate / restore

| Modo | Quem | Restore |
|------|------|---------|
| `tower_pve_squad` | Party na luta vs boss (escala×4) | Mesmo andar; `floorCleared` se vitória |

- Finalize: `finalizeTowerBattleEnd`.
- Morte mid-fight → restore do morto no **gate**; sessão continua com vivos.
- Loot: mesmo canal PVE (pending + Coletar) com tabela própria da torre.

---

## Persistência / sync

| Campo | Uso |
|-------|-----|
| `towerPresence` / run state | Party, floor, unlock, clears da run |
| `highestFloorCleared` | Ranking / progressão |
| `floorClearCounts[floor]` | Vezes que venceu aquele andar |
| Buff XP | `towerXpBuffPercent` + `towerXpBuffExpiresAtServerMs` |

Wire: campos em `state-sync` / `full-state-sync` (ou `tower-run-sync`). Tipos: `src/shared/tower/towerTypes.ts`.

---

## Módulos

| Camada | Path |
|--------|------|
| Shared (contrato) | `src/shared/tower/` |
| Server runtime | `src/server/tower/` *(criar na fatia runtime)* |
| Handlers | `src/server/handlers/tower/` *(criar na fatia intents)* |
| Finalize | `src/server/combat/finalizeTowerBattleEnd.ts` |
| HUD PC | `src/client/app/components/world/panels/TowerPortalPanel.tsx` |
| Layouts | Construct já em `construct-editor/layouts/` — `npm run sync:construct` |
| Assets | `public/assets/creatures/boss_tower_power/` |

---

## Ordem de execução (fatias)

1. **Wire mundo:** `MapId` + `CONSTRUCT_LAYOUT_BY_MAP_ID` + sync Construct + portais cidade↔gate + andares (sem combate).
2. **PC + party + Liberar + spawn 5 min** → enter floor privado.
3. **Ativador → combate** andar 1 (entrada + hit duplo) + restore + next_level.
4. Bosses **2–5** (catálogo já descreve mecânicas).
5. Recompensas: loot tabela torre + buff XP + fama no leave + ranking PC.
6. Andares **6–10** + leave no 10.
7. Fase 2: lobby social 15 / PVP / Isolation Pull legado.

---

## Checklist merge

1. Layouts no contrato Construct + `audit:construct`?
2. Instância de andar filtrada por `partyRunId` (peers não vazam)?
3. Timer 5 min / unlock / fases de boss só no servidor?
4. Arena só via gateway de combate?
5. Economia/loot só `economyGateway`?
6. WorldMap/BattleScreen sem import cruzado de DOM?
7. Identidade de classe do hub (sem `classId \|\| 'IMPETUS'`)?

---

## Proibido

- Cliente calcular escala, buff %, fama ou loot.
- Events Construct liberar spawn ou abrir batalha.
- Abandon mid-run (exceto morte / leave checkpoint).
- Rejoin após morte na mesma run.
- PVP lobby antes do loop PVE estável.
- Um projeto Construct por combate.

# Torre de Poder (raid MVP)

Raid por shard: farm de **itens, dinheiro, fama** (+ buff de XP de nível).  
Contrato **fechado** (entrada). **MVP online jogável**: mapas, PC, party, enter floor, ativador→combate, clear/next/leave, restore gate, buff XP, fama, ranking.  
Gaps: **BattleScreen compartilhada multi-player** → ver [combate-pvp.md](combate-pvp.md) § *Multi 2x2 / party battle* (motor geral; Torre reusa). Também: mock/local; loot table própria; markers Construct `leave`/`next_level` (alguns coords ruins — fallback no generate).

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
| Andares 1–N | **Instância privada por party** · **1 party por vez** nos andares |
| Parties no hall | **Várias** ativas ao mesmo tempo |
| Limite de runs | MVP **sem** limite diário; anti-farm = CD create + ocupação |
| PVP / lobby 15 / Isolation Pull social | **Fase 2** — fora do MVP |

---

## Fluxo do jogador

```text
city_01 (direita)
  └─ city_portal_towerpower
       └─ tower_gate (layout: entradatorredopoder)     ← PÚBLICO
            ├─ computador_towerpower
            │     Ativar party (solo OK) + ranking
            ├─ spawn (enter_spaw / spaw_enter)
            │     HUD de acesso — cada um entra sozinho
            └─ andares privados (1 ocupação por shard)
                 tower_floor_1 … tower_floor_5 (MVP)
```

### Computador + entrada (contrato)

1. **PC** → **Ativar party** (1–4; solo OK). Sem “Liberar 5 min”.
2. Player anda até o **spawn** em frente à torre → HUD de acesso → **Entrar na Torre**.
3. **Qualquer membro** pode ser o 1º. Torre fica **ocupada** por essa party.
4. Após o 1º enter: janela **10s** (chip **TORRE Xs** ao lado do SINAL). Demais membros vão ao spawn e clicam **Entrar** (agency; **sem auto-pull**). Moscou = fora da run (sem XP/loot/fama).
5. Solo / todos dentro → roster **lock** (solo trava na hora).
6. No andar: `ativador_boss` → só quem está `membersInRun`.

### Ocupação / cooldown / AFK

| Regra | Valor |
|-------|--------|
| Torre livre | Quando o **último vivo** sai dos andares |
| CD criar party | **5 min** no momento em que **ele** sai (evacuate / morte / AFK) |
| AFK nos andares | **3 min** sem movimento → deport gate + CD |
| Outra party no spawn | Vê **Torre ocupada** |

### Progressão na run

| Evento | Efeito |
|--------|--------|
| Vitória no boss | Volta ao **mesmo andar**; `next_level` libera |
| Morte | Jogador → **entrada** (`tower_gate`); vivos continuam; **sem rejoin** na run |
| Abandonar mid-run | **Proibido** — só morte, AFK deport ou leave no checkpoint |
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
| `computador_towerpower` | Terminal party / ranking (PNG **no Construct**; overlay sem placeholder) |
| `enter_spaw_towerpower` / `spaw_enter_towerpower` | Spawn / HUD de acesso |
| `torre_do_poder` | Prop visual |
| `ativador_boss` | Qualquer um da run interage → BattleScreen |
| `spawn_boss_tower_power` | Âncora / “mais perto do boss” |
| `next_level_power_tower` | Portal N→N+1 (só pós-clear) |
| `leave_level_power_tower2` | Evacuate no checkpoint (pós-boss) |

Assets boss: `public/assets/creatures/boss_tower_power/` (`floor_01` … `floor_05`).

**Proibido no Construct:** timer, party, unlock, combate, BattleScreen via eventsheet.

---

## Recompensas

| Canal | Quando | Quem |
|-------|--------|------|
| Loot boss (itens/dinheiro) | Opt-in **Coletar** (estilo criatura; pool própria) | Só **vivos** na BattleScreen (roster da run) |
| Buff XP nível | Na **saída** (leave / morte / AFK) | `+10% × andares completados` por **1h** |
| Fama | Só no **leave** do checkpoint | Só quem **usou o leave** |

### Ranking no PC

- Pessoal + top shard: **máx. andar alcançado** + **vezes que venceu esse andar**.

---

## Intents (Gateway)

Handlers em `src/server/handlers/tower/`. UI: pending submit no painel.

| Intent | Função |
|--------|--------|
| `TOWER_PARTY_CREATE` / `INVITE` / `RESPOND` / `LEAVE` / `READY` | Monta time no PC (`CREATE` respeita CD 5 min) |
| `TOWER_UNLOCK_ENTRY` | **Deprecated** no-op (compat) |
| `TOWER_ENTER_FLOOR` | Spawn → ocupa / janela 10s / mesma instância + **`worldSpawn`** (cliente troca mapa) |
| `TOWER_ACTIVATE_BOSS` | Ativador → inicia `tower_pve_squad` |
| `TOWER_ASCEND` | `next_level` pós-clear + `worldSpawn` |
| `TOWER_EVACUATE` | Leave no checkpoint → gate + fama + buff + CD + `worldSpawn` |

Sync party: WS `tower-run-sync` (`TowerHudPublicSnapshot`, opcional `worldSpawn` p/ AFK deport).

Cliente: `bindAuthoritativeWorldMapTransition` → `Exploration.applyServerWorldSpawn` (mesmo caminho do portal).

Constantes: `TOWER_ENTRY_WINDOW_MS` (10s), `TOWER_PARTY_CREATE_COOLDOWN_MS` (5 min), `TOWER_AFK_DEPORT_MS` (3 min).

---

## Módulos

| Camada | Path |
|--------|------|
| Shared (contrato) | `src/shared/tower/` |
| Server runtime | `src/server/tower/TowerRunRuntime.ts` |
| Handlers | `src/server/handlers/tower/` |
| HUD PC / spawn | `WorldTowerComputerPanel.tsx` |
| Timer SINAL | `WorldTowerEntryTimerWidget.tsx` |
| Layouts | Construct — `npm run sync:construct` |
| Assets | `public/assets/creatures/boss_tower_power/` |

---

## Proibido

- Cliente calcular escala, buff %, fama ou loot.
- Events Construct liberar spawn ou abrir batalha.
- Auto-puxar party no enter.
- Abandon mid-run (exceto morte / AFK / leave checkpoint).
- Rejoin após morte na mesma run.
- PVP lobby antes do loop PVE estável.

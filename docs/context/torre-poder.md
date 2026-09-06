# Torre de Poder (futuro)

Endgame por shard: lobby social por andar + arenas de combate instanciadas.
**Não implementado.** Esta ficha é o contrato para quando formos desenvolver.

Combate motor: [combate.md](combate.md). Mundo Construct: [mundo.md](mundo.md). Mundos/shard: [personagem-mundos.md](personagem-mundos.md). Intents: [intents-gateway.md](intents-gateway.md).

---

## Premissa fechada

| Decisão | Valor |
|---------|--------|
| Escopo | **1 torre por `serverId`** (shard) |
| Cap lobby | **15** jogadores por andar (mapa físico) |
| Party | **1–4**; no máx. **1 de cada classe** |
| Boss | Sempre escala **como se fossem 4** (heroico se incompleto) |
| Combate real | Só em **arena BattleScreen** (não no lobby Construct) |
| Relógio de fase | **Só servidor** (nunca cliente) |
| PVP lobby | **Fase 2** — não MVP |
| Late join | Entra no **próximo round** (nunca mid-round) |

---

## Espaço: o que é Construct vs o que não é

### Modelo mental

```text
Shard (serverId)
  └── Torre (1 por shard)          ← lógica / runtime servidor
        └── Andar N
              ├── LobbyInstance      ← mapa Construct + cap 15 + peers
              └── CombatSessions[]   ← BattleScreen (squad / pull)
```

- **Lobby** = exploração multiplayer (mesmo padrão cidade/farm: Construct layout + overlay + `GameLoop`).
- **Arena** = combate autoritativo já existente (`CombatGateway` / `CombatDispatchPayload`). **Não** é layout Construct novo por luta.
- **Instância de lobby** ≠ “copiar o export HTML5 N vezes”. É o **mesmo layout** Construct, com **runtime de presença** separado (`lobbyInstanceId` / `cycleId`) no servidor.

### Construct — o que precisa existir no editor

| Peça | Layout Construct | `mapId` Altercadia (sugerido) | Notas |
|------|------------------|-------------------------------|--------|
| Acesso / rua da torre | POI na cidade **ou** layout `torre_acesso` | `city_01` portal **ou** `tower_gate` | Entrada social; não precisa cap 15 |
| Lobby genérico de andar | **`torre_lobby`** (1 layout reutilizável) | `tower_floor` | Skin/atmosfera por `floorIndex` via bridge (tileset tint / props), **sem** 20 layouts no MVP |
| Portal de registro | marker `portal_tower_party` | — | HUD React ao interagir |
| Portal de subida | marker `portal_tower_ascend` | — | Só após clear autoritativo |
| Spawn / safe | `spawn_tower_lobby` | — | placements gerados |
| Zona do caçador (visual) | marker ou área nomeada | — | só feedback; pull é servidor |

**MVP Construct:** 1 layout `torre_lobby` (+ opcional `torre_acesso`). Andares 1..N = **mesmo layout**, estado `floorIndex` no sync.  
**Depois:** layouts únicos por boss floor se o art pedir.

### O que NÃO fazer no Construct

- Não criar um layout por combate / por party.
- Não simular timer de fase, pull ou party no eventsheet.
- Não abrir BattleScreen por lógica Construct — só via `altercadia:set-mode` / lifecycle de combate já existente.
- Não tratar “instância” como segundo projeto Construct; instância = **sessão de mundo no servidor** + `altercadia:load-map` com o mesmo `layoutId`.

### Bridge / runtime (quando implementar)

| Mensagem / peça | Uso na torre |
|-----------------|--------------|
| `altercadia:load-map` | Carrega `torre_lobby` ao entrar no andar |
| `altercadia:exploration-frame` | Peers do **mesmo** `lobbyInstanceId` (AOI cap 15) |
| `altercadia:battle-frame` / set-mode battle | Ao entrar arena (pull ou squad) — Construct pausa como hoje |
| Overlay | Players do lobby; boss do lobby só se houver **avatar de pressão** (opcional MVP: VFX/aviso, sprite depois) |

Contrato tipado: estender `constructExportContract.ts` + `CONSTRUCT_LAYOUT_BY_MAP_ID` quando o layout existir.

### Capacidade e “instância”

| Conceito | Dono | Regra |
|----------|------|--------|
| `towerId` | = `serverId` | 1:1 MVP |
| `floorIndex` | servidor | 1..F_MAX |
| `cycleId` | servidor | muda em `CYCLE_END` |
| `lobbyInstanceId` | servidor | identidade da sala; no MVP pode = `towerId:floorIndex:cycleId` |
| Cap 15 | `GameLoop` / runtime torre | 16º rejeitado (intent ou enter-floor) |
| Peers | `nearbyPlayers` filtrado por `lobbyInstanceId` | Não vazar jogadores de outro ciclo/andar |

Jogadores em andares diferentes = **mapas lógicos diferentes** (mesmo layout visual ok).

---

## Fases do andar (servidor)

```text
OPEN_ASSEMBLE → PORTAL_LOCK → HUNT → CYCLE_END → (próximo ciclo)
```

| Fase | Portal party | Caçador (pull) | PVP lobby |
|------|--------------|----------------|-----------|
| `OPEN_ASSEMBLE` | aberto | off | off (MVP) |
| `PORTAL_LOCK` | só commit já queued | off | off |
| `HUNT` | fechado p/ novos | **on** | fase 2 |
| `CYCLE_END` | fechado | off | off |

Cliente só espelha `phase` + `phaseEndsAtServerMs`.

Snapshot público (contrato futuro):

```ts
type TowerFloorPublicState = {
  towerId: string;
  floorIndex: number;
  cycleId: string;
  phase: 'OPEN_ASSEMBLE' | 'PORTAL_LOCK' | 'HUNT' | 'CYCLE_END';
  phaseEndsAtServerMs: number;
  lobbyPlayerCount: number; // 0..15
  portalOpen: boolean;
  hunterActive: boolean;
};
```

---

## Party e intents (Gateway)

Handlers futuros em `src/server/handlers/tower/`. UI: `ActionGatewayButton` + pending registry.

| Intent | Função |
|--------|--------|
| `TOWER_ENTER_FLOOR` | Entra no lobby do andar (valida cap / progressão) |
| `TOWER_PARTY_CREATE` | Abre registro no portal |
| `TOWER_PARTY_INVITE` / `RESPOND` | Monta time |
| `TOWER_PARTY_LEAVE` | Sai |
| `TOWER_PARTY_READY` | Toggle ready |
| `TOWER_PARTY_COMMIT` | Leader trava → fila de arena |
| `TOWER_LATE_JOIN` | Entra na sessão pull/squad da party (próximo round) |
| `TOWER_EVACUATE` | Sai da torre com custo (anti-limbo) |

Proibido: mutar party/moeda/XP no cliente.

---

## Combate

| Modo | Quem | Restore |
|------|------|---------|
| `tower_pve_squad` | 1–4 vs boss escala 4 | Lobby do mesmo andar + portal subida se vitória |
| `tower_pve_pull` | 1 vs boss escala 4 (+ late join até 4) | Idem |

- Reusar `CombatGateway` / engine; finalize dedicado `finalizeTowerBattleEnd`.
- Estender `battleWorldRestorePolicy` com `towerSquad` / `towerPull`.
- Isolation Pull: **tick servidor** escolhe alvo (isolado / low HP) → `START_COMBAT`; não é intent do monstro no client.
- Late join: só no **início do próximo round** (nunca mid-round).

---

## Sync (wire)

| Canal | Conteúdo |
|-------|----------|
| `tower-floor-sync` ou campos no `state-sync` | `TowerFloorPublicState` |
| `combat-event` | Igual hoje |
| `full-state-sync` | `towerPresence?` / `highestFloorCleared` no save |

Tipos futuros: `src/shared/tower/towerTypes.ts`.

---

## Módulos alvo (ainda não existem)

| Camada | Path sugerido |
|--------|----------------|
| Shared | `src/shared/tower/` |
| Server runtime | `src/server/tower/TowerFloorRuntime.ts` |
| Handlers | `src/server/handlers/tower/` |
| Finalize | `src/server/combat/finalizeTowerBattleEnd.ts` |
| HUD | `src/client/app/components/world/panels/TowerPortalPanel.tsx` |
| Construct | layout `torre_lobby` + markers; sync via `npm run sync:construct` |
| Catalog | `mapId` em catálogo de mapas + `serverInstanceCatalog` (torre permitida no shard) |

---

## Ordem de implementação (quando for a hora)

1. **Construct:** layout `torre_lobby` + portal markers + `load-map` + enter floor sem party (só presença + cap 15).
2. **Fases + timer** servidor + UI espelho.
3. **Party intents** + commit → arena squad.
4. **Isolation Pull** + late join (próximo round).
5. **Progressão / loot / evacuate**.
6. **PVP lobby** (fase 2).

---

## Checklist antes de merge (quando existir código)

1. Layout no contrato Construct + audit WebGL?
2. Cap 15 e filtro de peers por `lobbyInstanceId`?
3. Fase só no servidor?
4. Arena só via gateway de combate (sem lógica Construct)?
5. Economia só `economyGateway`?
6. WorldMap/BattleScreen sem import cruzado de DOM?

---

## Proibido

- Implementar PVP lobby antes do loop PVE da torre estável.
- Um projeto Construct por instância de combate.
- Escala de boss no cliente.
- `classId || 'IMPETUS'` ao montar party — identidade do hub.
- Cliente avançar fase da torre com timer local.

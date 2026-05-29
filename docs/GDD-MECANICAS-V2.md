# Altercadia V2 — Game Design Document (Base)

**Versão:** 0.3 (alinhado ao motor único V1.2 + `CombatGateway` + protocolo cliente)  
**Escopo:** mecânicas tipadas e implementadas em `src/` — `CombatEngine` (balance `1.2.0`), `CombatGateway`, `mapEventsForClient`, Dashboard  
**Nomenclatura oficial:** **Engine** (motor autoritativo), **Dashboard** (interface do jogador), **Dispatch** (envio de intenções via `ActionRequest` / `GameAPI.dispatchAction`)

---

## 1. Autoridade do Servidor (Cliente Hostil)

### Nome da Mecânica
Autoridade do Servidor / Cliente Hostil

### Definição Técnica
O jogador e o Dashboard **não calculam** resultado de combate, economia ou inventário. Eles emitem **intenções** (`ActionRequest` com `requestId`) e exibem **snapshots** e **eventos** produzidos pela Engine. Qualquer estado exibido deriva de `CombatState` / `CombatEvent` validados no servidor (ou, no sandbox local, na `CombatEngine` como substituto autoritativo).

### Impacto na Lógica (Engine)
- Toda mutação de HP, turno e fase ocorre dentro da Engine após validação.
- Rejeições são eventos (`ACTION_REJECTED`) com `reason` explícito — nunca exceções silenciosas no cliente.

### Impacto no Dashboard/Interface
- Botões e inputs disparam **Dispatch**, não aplicam dano localmente.
- UI reage a `getState()` / stream de `CombatEvent` (via `GameAPI` ou gateway futuro).

---

## 2. Estado Global de Combate (`CombatState`)

### Nome da Mecânica
Estado Global de Combate (SSOT de Batalha)

### Definição Técnica
Snapshot imutável (na leitura) que representa uma batalha:

| Campo | Tipo | Papel |
|--------|------|--------|
| `battleId` | `string` | Identificador único da instância |
| `turn` | `number` | Contador de turno (incrementa após ação resolvida) |
| `phase` | `'IDLE' \| 'CHOOSING' \| 'RESOLVING' \| 'ENDED'` | Máquina de estados da batalha |
| `combatants` | `Record<string, Combatant>` | Elenco vivo da batalha |
| `activeActorId` | `string \| null` | Quem pode agir na fase `CHOOSING` |

### Impacto na Lógica (Engine)
- `CombatEngine` mantém estado interno; `getState()` devolve cópia defensiva (`cloneCombatants`).
- Transições: `startChoosing` → `CHOOSING`; `applyAction` → `RESOLVING` → `CHOOSING` ou `ENDED`.

### Impacto no Dashboard/Interface
- `GameAPI.getState()` e `GameClient.renderState(state)` são o contrato de pintura do Dashboard.
- Exibir turno, fase, HP de todos os combatentes e indicador de “vez de quem”.

---

## 3. Combatente (`Combatant`)

### Nome da Mecânica
Combatente

### Definição Técnica
Entidade participante da batalha:

- `id`, `name`
- `hp`, `maxHp` (vida atual e teto)
- `skills: SkillData[]` (catálogo autoritativo de ações disponíveis)

### Impacto na Lógica (Engine)
- Validação `INVALID_ACTOR` se `actorId` ∉ `combatants`.
- Validação `INVALID_SKILL` se `skillId` não pertence ao ator.
- HP mutado apenas no combatente alvo após resolução de dano.

### Impacto no Dashboard/Interface
- Barras de vida por `id` (`data-hp-for` no `HUDManager`).
- Lista de habilidades derivada de `combatants[localId].skills` (quando sincronizada).

---

## 4. Habilidade (`SkillData`)

### Nome da Mecânica
Habilidade de Combate

### Definição Técnica
Ação ofensiva (contrato atual):

- `id`, `name`
- `damage: number` — valor aplicado na resolução
- `cooldown: number` — **campo de contrato** (ver mecânica pendente §P2)

### Impacto na Lógica (Engine)
- Dano efetivo: `selectedSkill.damage` (ou `0` se `skillId === null` / passar).
- Fórmula atual: `hpAfter = max(0, target.hp - damage)`.

### Impacto no Dashboard/Interface
- Slots / botões de habilidade mapeados por `skill.id`.
- Rótulo e feedback de uso via `COMBAT_LOG` e `DAMAGE_DEALT`.

---

## 5. Máquina de Fases de Batalha

### Nome da Mecânica
Fases de Batalha (`IDLE` → `CHOOSING` → `RESOLVING` → `ENDED`)

### Definição Técnica
| Fase | Significado |
|------|-------------|
| `IDLE` | Batalha criada; aguardando `startChoosing` |
| `CHOOSING` | Janela de Dispatch para o `activeActorId` |
| `RESOLVING` | Engine processando ação aceita (transitória) |
| `ENDED` | Pelo menos um combatente com `hp <= 0` |

### Impacto na Lógica (Engine)
- `applyAction` só aceita entrada em `CHOOSING` com `activeActorId === request.actorId`.
- Após resolução: `turn++`, próximo ator ou `ENDED`.

### Impacto na Dashboard/Interface
- Habilitar ações **somente** quando `phase === 'CHOOSING'` e (futuro) `activeActorId === jogadorLocal`.
- `HUDManager` aplica `.is-disabled` / `aria-disabled` fora de `CHOOSING`.

---

## 6. Sistema de Turnos e Ordem de Atores

### Nome da Mecânica
Turnos Sequenciais com Rotação Circular

### Definição Técnica
- `turn` incrementa após cada ação aceita e resolvida.
- Ordem de atores: `Object.keys(combatants)` (ordem de inserção no estado).
- `pickNextActorId`: próximo ID na lista circular após o ator atual.

### Impacto na Lógica (Engine)
- `startChoosing(actorId)` define primeiro ator e emite `BATTLE_START` + `TURN_START`.
- Pós-ação: `activeActorId` = próximo na rota (ou `null` se `ENDED`).

### Impacto no Dashboard/Interface
- Label: `Turn N · PHASE` (`HUDManager.onTurnUpdate`).
- Destacar combatente ativo; bloquear input de não-atores.

---

## 7. Dispatch de Intenção (`ActionRequest`)

### Nome da Mecânica
Dispatch de Ação (Intenção do Jogador)

### Definição Técnica
Pacote que o Dashboard envia à Engine (nunca o resultado):

```ts
ActionRequest {
  battleId, actorId, turn, skillId | null, requestId
}
```

- `skillId: null` → passar / ação sem dano (dano 0).
- `requestId` → chave de rastreio (idempotência planejada; ver §P3).

### Impacto na Lógica (Engine)
- Entrada autoritativa: `CombatGateway.dispatchAction(request)` → `CombatEngine.applyAction(request)`.
- Saída: eventos normalizados por `mapEventsForClient` + `CombatState` via `GameAPI.dispatchAction`.

### Impacto no Dashboard/Interface
- `GameClient.sendAction(action)` — camada de intenção (log / socket futuro).
- Formulário de habilidade monta `ActionRequest` com `turn` e `battleId` do snapshot atual.

---

## 8. GameAPI (Controle Remoto da Engine)

### Nome da Mecânica
GameAPI — Fachada de Controle Remoto

### Definição Técnica
API exportada em `src/game.ts`:

- `getState(): CombatState` — leitura para o Dashboard.
- `dispatchAction(action): { events, state }` — Dispatch + snapshot pós-processamento.

### Impacto na Lógica (Engine)
- Encapsula `CombatGateway` (motor V1.2 único) e setup default (`hero` / `enemy`, `startBattle('hero')`).

### Impacto no Dashboard/Interface
- Único ponto de integração recomendado para protótipos e testes de UI sem acoplar ao motor interno.

---

## 9. Resolução de Dano

### Nome da Mecânica
Resolução de Dano por Habilidade

### Definição Técnica
1. Identifica alvo: **próximo combatente na ordem circular** após o ator (não seleção manual pelo jogador).
2. `amount` base = `skill.damage` (ou `0` se passar); V1.2 aplica **elasticidade de HP**, **decay de cura** e **sudden death** (turno 9+) antes do valor final.
3. Atualiza `target.hp`; emite `DAMAGE_DEALT` com `hpAfter` e eventos de auditoria (`ELASTICITY_APPLIED`, etc.).

### Impacto na Lógica (Engine)
- Evento: `DAMAGE_DEALT { sourceId, targetId, amount, hpAfter }`.
- Pode encadear `ENDED` se `hp <= 0`.

### Impacto no Dashboard/Interface
- Atualizar barra de HP do `targetId`.
- Log: `source -> target (amount)`.

---

## 10. Validação e Rejeição de Ações (Segurança)

### Nome da Mecânica
Validação de Ações / Anti-Exploit

### Definição Técnica
Motivos consolidados (`ACTION_REJECTED.payload.reason`):

| Reason | Condição |
|--------|----------|
| `INVALID_BATTLE` | `battleId` ≠ estado |
| `NOT_YOUR_TURN` | fase ≠ `CHOOSING` ou ator ≠ `activeActorId` |
| `STALE_TURN` | `request.turn` ≠ `state.turn` |
| `INVALID_ACTOR` | ator inexistente |
| `INVALID_SKILL` | skill não pertence ao ator |
| `POTION_ON_COOLDOWN` | `consumableId` com cooldown/exaustão ativo |
| `NOT_IN_CHOOSING_PHASE` | `resolveTurn` fora de `CHOOSING` |

**Teste de stress consolidado:** segundo Dispatch no mesmo turno → tipicamente `NOT_YOUR_TURN` (turno já avançou e vez passou ao próximo ator).

### Impacto na Lógica (Engine)
- Retorno antecipado com um único evento de rejeição; estado inalterado.

### Impacto no Dashboard/Interface
- Exibir feedback de erro (toast / log).
- Não atualizar HP nem reabilitar botões indevidamente.

---

## 11. Término de Batalha

### Nome da Mecânica
Condição de Vitória / Derrota (`ENDED`)

### Definição Técnica
Se qualquer `combatant.hp <= 0` após resolução:

- `phase = 'ENDED'`
- `activeActorId = null`

### Impacto na Lógica (Engine)
- Impede novos Dispatches válidos (`NOT_YOUR_TURN` / fase incompatível).

### Impacto no Dashboard/Interface
- Desabilitar painel de ações.
- Tela de resultado (não implementada no V2 atual — placeholder de design).

---

## 12. Bus de Eventos de Combate (`CombatEvent`)

### Nome da Mecânica
Eventos de Combate (Event-Driven)

### Definição Técnica
**Protocolo cliente** (`CLIENT_CORE_EVENT_TYPES` — ver `combatEventCompat.ts`):

| Evento | Uso |
|--------|-----|
| `BATTLE_START` | Início; snapshot de combatentes |
| `TURN_START` | Novo turno / fase / ator ativo |
| `BATTLE_STATE_UPDATE` | Espelho de `TURN_START` para a HUD (`mapEventsForClient`) |
| `ACTION_ACCEPTED` | Intenção válida, entrando em resolução |
| `ACTION_REJECTED` | Intenção inválida + `reason` |
| `DAMAGE_DEALT` | Dano aplicado |
| `COMBAT_LOG` | Linha narrativa / debug |
| `SKILL_CATALOG` | Paleta de skills do ator ativo em `CHOOSING` (injetado por `mapEventsForClient`) |

**Eventos estendidos V1.2** (`CLIENT_EXTENDED_EVENT_TYPES`): `TURN_ORDER_RESOLVED`, `CONSUMABLE_USED`, `EXHAUSTION_APPLIED`, `ELASTICITY_APPLIED`, `HEALING_DECAY_APPLIED`, `SUDDEN_DEATH_SCALING_APPLIED`.

### Impacto na Lógica (Engine)
- `CombatEngine` produz eventos brutos; `CombatGateway` expõe ao cliente apenas após `mapEventsForClient`.

### Impacto no Dashboard/Interface
- `HUDManager.consume(event)` — roteador de UI por tipo.
- Alternativa: aplicar snapshot completo via `renderState` após Dispatch.

---

## 13. Dashboard — Espelho de Estado (`GameClient` + `HUDManager`)

### Nome da Mecânica
Dashboard como Espelho (Render + Intenção)

### Definição Técnica
- **`GameClient`**: `sendAction` (Dispatch) e `renderState(CombatState)` (pintura).
- **`HUDManager`**: consumo fino de `CombatEvent` (turno, log, HP, catálogo de skills em cache).

### Impacto na Lógica (Engine)
- Nenhum — camada estritamente cliente.

### Impacto no Dashboard/Interface
- Separação clara: intenção (`sendAction`) vs. projeção (`renderState` / `consume`).
- Próximo passo de produção: ligar `dispatchAction` → `consume` para cada evento retornado.

---

## 14. Arquitetura Event-Driven e Fronteiras de Módulo

### Nome da Mecânica
Desacoplamento por Eventos (Combate / Economia)

### Definição Técnica
- Combate, guildas e outros domínios **não** chamam economia diretamente.
- Operações de itens/moedas/inventário passam por **Gateway** econômico; mutações em transação ACID.
- `src/shared/` é SSOT de tipos e contratos entre Engine e Dashboard.

### Impacto na Lógica (Engine)
- Combate V2 já segue eventos tipados; economia permanece fora do escopo do `CombatEngine` atual.

### Impacto no Dashboard/Interface
- Carteira e inventário só via eventos autoritativos (ex.: `WALLET_UPDATE` no legado; a reconfirmar na V2).

---

## 15. Política Zero-JS e Build Rigoroso (Meta-Mecânica de Produção)

### Nome da Mecânica
Contrato de Código V2 (TypeScript Strict)

### Definição Técnica
- Código de jogo em `.ts` com `strict: true`.
- `typecheck` antes de confiar em build; testes com `tsx --test`.
- Sem shims para legado: quebra → reimplementação nativa.

### Impacto na Lógica (Engine)
- Contratos em `src/shared/types.ts` e `events.ts` forçam alinhamento cliente/servidor.

### Impacto no Dashboard/Interface
- Dashboard consome os mesmos tipos que a Engine via `shared`.

---

## 16. Iniciativa, Prioridade e Velocidade (Baseline Oficial V1)

### Nome da Mecânica
Pipeline de Iniciativa e Resolução de Turno

### Definição Técnica
A ordem de resolução do turno segue 3 camadas, nesta ordem:

1. `skill.priority` (camada tática do moveset)
2. `effectiveSpeed`
3. Seed de desempate determinística (`battleId + turn + actorId`)

Regra principal: prioridade maior sempre resolve antes.

#### 16.1 Fórmula oficial de velocidade efetiva

```txt
effectiveSpeed =
  flowSpeedBase
  + marcoSpeedFlat
  + equipSpeedFlat
  + buffSpeedFlat
  + runeSpeedFlatConditional
```

#### 16.2 Faixas de prioridade do moveset

| Tipo de ação | Prioridade | Regra |
|--------------|------------|-------|
| Reação/contra (fora de turno) | 3 | Resolve primeiro |
| Setup/controle/utilidade | 2 | Resolve antes de dano puro |
| Dano direto pesado | 1 | Resolve por último |

#### 16.3 Marcos de velocidade (Linha 1)

| Marco | Requisito | Bônus |
|-------|-----------|-------|
| `quickStep` | `flowSpeed >= 25` | `+4 speed` |
| `fluxRush` | `flowSpeed >= 50` | `+7 speed` |
| `timelessStride` | `flowSpeed >= 100` | `+11 speed` |

Stack dos marcos: cumulativo (`+22` total com os 3 ativos).

#### 16.4 Velocidade por slot de equipamento

Somente acessórios contribuem com velocidade:

| Slot | Limite V1 | Observação |
|------|-----------|------------|
| `M` (amulet) | até `+8` | principal peça de speed |
| `R2` (ring) | até `+6` | ajuste fino |
| `S` (book equipado) | até `+5` | passivo leve |
| `U2` (runa passiva) | até `+4` | apenas runa com stat de speed |
| `H/A/P/B` | `0` | bloqueado por regra do corpo |

Cap global de equipamento: `equipSpeedFlat <= 18`.

#### 16.5 Buffs temporários de velocidade

| Fonte | Efeito | Duração | Stack |
|-------|--------|---------|-------|
| `tonico_fluxo_menor` | `+6 speed` | 2 turnos | não stacka com outro tônico |
| `tonico_fluxo_maior` | `+10 speed` | 2 turnos | substitui menor |
| Skill de impulso (setup) | `+4 speed` | próximo turno | stacka com tônico, máx 1 buff de skill |

Cap temporário total: `buffSpeedFlat <= 14`.

#### 16.6 Runas condicionais de velocidade

| Runa | Trigger | Efeito |
|------|---------|--------|
| `runa_overclock_fluxo` | `IMPACT` | ganha `+5 speed` no próximo turno |
| `runa_passo_fantasma` | `BLOCK` | ganha `+7 speed` no próximo turno |
| `runa_volts_overclock` (atual) | `IMPACT` | mantém crit/PP (sem speed no V1) |

Cap condicional de runa: `runeSpeedFlatConditional <= 7`.

#### 16.7 Caps globais de segurança

- `effectiveSpeed` mínimo: `0`
- `effectiveSpeed` máximo: `140`
- Diferença prática recomendada para quase garantir primeiro: `>= 12`
- Mesma prioridade + diferença `< 3`: considerar disputa apertada (seed decide mais vezes)

#### 16.8 Regras de stacking (fechadas)

- Marcos: sempre cumulativos.
- Equip: cumulativo por slot, respeitando cap global.
- Buff temporário: 1 tônico ativo por vez + 1 buff de skill de speed por vez.
- Runa condicional: só 1 efeito de speed condicional ativo por turno.
- Tudo soma em `effectiveSpeed`.

### Impacto na Lógica (Engine)
- Antes de resolver ações concorrentes, a Engine deve ordenar intents por `(priority DESC, effectiveSpeed DESC, seed ASC)`.
- A Engine precisa manter fontes de velocidade separadas para auditoria (`base`, `marco`, `equip`, `buff`, `runaCondicional`), aplicando caps em cada estágio.
- Buffs/runa condicional devem ter duração e trigger orientados a evento (turn lifecycle + event bus).

### Impacto no Dashboard/Interface
- Mostrar prioridade da ação selecionada e indicador de ordem prevista de resolução.
- Expor breakdown de velocidade efetiva (tooltip/painel): base + marcos + equip + buffs + runa.
- Alertar “disputa apertada” quando mesma prioridade e diferença de speed `< 3`.

### Status de Implementação
**Implementado** em `CombatEngine` com config `combat_balance_v1_2.json` (`version: 1.2.0`):

- Iniciativa `score_based`: `initiativeScore = movesetPriorityScore + (speedBonusTotal × 2)`.
- Desempate: `effectiveSpeedRaw` → seed determinística (`battleId + turn + actorId`).
- Poções reativas, exaustão, elasticidade de HP, decay de cura e sudden death (turno 9+).
- Ordem concorrente: `resolveTurn` + evento `TURN_ORDER_RESOLVED` com `reason` e `debug`.

---

# Mecânicas mencionadas superficialmente — confirmação necessária

As entradas abaixo **não** estão consolidadas o suficiente para constar como mecânica fechada neste GDD. Confirme se deseja que eu expanda cada uma em seção completa na v0.2.

| ID | Mecânica | Contexto no histórico | Status no código V2 |
|----|----------|----------------------|---------------------|
| **P1** | Seleção manual de alvo | Discussão implícita; Engine usa próximo na rota | Alvo automático apenas |
| **P2** | Cooldown de habilidades | Campo `cooldown` em `SkillData` | Não processado pela Engine |
| **P3** | Idempotência por `requestId` | Comentário em `GameClient` | Sem deduplicação na Engine |
| **P4** | Passar turno (UI dedicada) | `skillId: null` suportado | Sem botão/fluxo UX definido |
| **P5** | Itens de combate | HUD legado (HABILIDADES / ITENS / PASSAR) | Ausente na V2 |
| **P6** | `BATTLE_STATE_UPDATE` + paleta de skills | Protocolo cliente | **Implementado** via `mapEventsForClient` no `CombatGateway` |
| **P7** | Economia / Gateway / `WALLET_UPDATE` | Regras de arquitetura Altercadia | Fora do `src/` V2 atual |
| **P8** | Overworld / grid / dash 15×15 | Diretrizes de produto | Não implementado neste chat |
| **P9** | Áudio (master volume) | Ajuste em sessão anterior | Expurgado na migração |
| **P10** | Tipos de skill (heal/buff/debuff) | Substituídos por `damage` + `cooldown` | Confirmar se haverá retorno |
| **P11** | Pipeline de iniciativa V1.2 no runtime | Baseline §16 | **Implementado** no `CombatEngine` (sem motor legado / sem feature flag) |

---

# Glossário rápido

| Termo | Significado |
|-------|-------------|
| **Engine** | `CombatEngine` + regras autoritativas em `src/server/engine/` |
| **Gateway** | `CombatGateway` — único ponto de entrada servidor; aplica `mapEventsForClient` |
| **Dashboard** | `GameClient`, `HUDManager` e UI do jogador |
| **Dispatch** | Envio de `ActionRequest` (`GameAPI.dispatchAction` / `sendAction`) |
| **Snapshot** | `CombatState` retornado por `getState()` |
| **SSOT** | `src/shared/` — tipos e eventos compartilhados |

---

*Documento alinhado ao repositório V2 (motor de combate único V1.2). Pendências de produto: P1–P5, P7–P10 (ver tabela acima). Dados de runtime não são versionados (`data/` ignorado no `.gitignore`).*

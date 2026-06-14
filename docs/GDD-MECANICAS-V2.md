# Altercadia V2 — Game Design Document (Base)

**Versão:** 0.4 (motor V1.2 + catálogo de moves de classe + tooltips narrativos oficiais)  
**Escopo:** mecânicas tipadas e implementadas em `src/` — `CombatEngine` (balance `1.2.0`), `classMovesetCatalog`, `classMoveNarrativeTooltips`, `CombatGateway`, Dashboard  
**Nomenclatura oficial:** **Engine** (motor autoritativo), **Dashboard** (interface do jogador), **Dispatch** (envio de intenções via `ActionRequest` / `GameAPI.dispatchAction`)  
**Documento complementar (kits por classe):** [`CLASS-MOVES-KITS-v1.md`](./CLASS-MOVES-KITS-v1.md)

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
- `skills: SkillData[]` — **4 moves** do loadout confirmado, enriquecidos com `effectKind`, PP e cooldown runtime

### Impacto na Lógica (Engine)
- Validação `INVALID_ACTOR` se `actorId` ∉ `combatants`.
- Validação `INVALID_SKILL` se `skillId` não pertence ao ator.
- HP mutado apenas no combatente alvo após resolução de dano.

### Impacto no Dashboard/Interface
- Barras de vida por `id` (`data-hp-for` no `HUDManager`).
- Lista de habilidades derivada de `combatants[localId].skills` (quando sincronizada).

---

## 4. Habilidade (`SkillData` / `MoveDefinition`)

### Nome da Mecânica
Habilidade de Combate (Move)

### Definição Técnica
Contrato autoritativo em `src/shared/types/combat.ts` (`SkillData`) e catálogo em `classMovesetCatalog.ts`:

| Campo | Papel |
|-------|--------|
| `id`, `name` | Identidade do move |
| `damage` / `basePower` | Poder base (0 em setups puros) |
| `effectKind` | Identidade mecânica — `MoveEffectKind` (motor faz `switch`) |
| `effectParams` | Números fechados por move (burn %, escudo %, eco %, etc.) |
| `priority` | 1 \| 2 \| 3 — camada tática na iniciativa (§16) |
| `cooldown` | Turnos bloqueados após uso — resolvido via catálogo |
| `ppMax` / `ppCurrent` | Orçamento de uso por batalha |
| `target` / `moveTarget` | `SELF`, `ENEMY`, `ALL_ENEMIES`, `ALLY_OR_SELF` |
| `scalingStat` | Rótulo de escala (STR / AGI / DEF / CRIT) — tooltip e estilo |
| `category` | `ATTACK` \| `DEFENSE` \| `SUPPORT` \| `UTILITY` |

**SSOT de stats de classe:** `classMovesetCatalog.ts` (`isDefined: true`).  
**SSOT de copy/UI:** `classMoveNarrativeTooltips.ts` (tooltips oficiais de 4 linhas — §18).

Moves de monstro usam `monsterSkillCatalog.ts` com o mesmo contrato reduzido.

### Impacto na Lógica (Engine)
- `CombatEngine` resolve por `effectKind`, não por `damage` isolado.
- Cooldown e PP são debitados após ação aceita (`resolveMoveCooldownFromCatalog`, `ppCurrent--`).
- Dano/cura/buff passam por `calculateDamage` / handlers de status e modificadores runtime.

### Impacto no Dashboard/Interface
- Slots mapeados por `skill.id` do loadout confirmado (4 ativos).
- Tooltip: `buildMoveTooltipLines` → narrativa oficial quando `resolveClassMoveNarrativeTooltip(id)` existe.
- Título HUD: `{Nome} | {Preparação \| Execução \| Suporte}`.

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

## 9. Resolução de Ação (Dano, Cura, Status)

### Nome da Mecânica
Resolução por `MoveEffectKind`

### Definição Técnica
Pipeline após `ACTION_ACCEPTED`:

1. **Validação** — fase, turno, PP, cooldown, alvo (`battleTargeting`).
2. **Ordem concorrente** — `priority` → `effectiveSpeed` → seed (§16).
3. **Switch mecânico** — `CombatEngine` despacha por `effectKind`:
   - Dano direto: `PureDamage`, `DebuffScalingDamage`, `HighRiskBurst`, `IgnoreBarrier`, …
   - DoT / delayed: `ApplyBurn`, `DelayedDetonation`, `Confuse` (residual)
   - Setup / controle: `AttackEcho`, `ApplyParalyze`, `MovesetWeaken`, `LockEnemyMoves`, `Thorns`, …
   - Sustain / defesa: `Heal`, `SelfShield`, `StatusImmunity`, …
4. **Fórmula** — `calculateDamage` + modificadores runtime (`RuntimeModifierKind`, status, escudo, barreira).
5. **Regras V1.2 globais** — elasticidade de HP, decay de cura, sudden death (turno 9+) quando aplicável.
6. **Eventos** — `DAMAGE_DEALT`, `HEAL_APPLIED`, status, modificadores; auditoria estendida.

`skillId: null` → passar (dano 0, sem efeito).

Alvo: derivado de `moveTarget` do catálogo (inimigo, si, aliado, área). Seleção manual pelo jogador permanece pendência de produto (§P1).

### Impacto na Lógica (Engine)
- Nenhum move calcula resultado no cliente.
- Efeitos empilham via estado runtime (escudo, thorns, eco de ataque, debuffs contáveis para `DebuffScalingDamage`).

### Impacto no Dashboard/Interface
- Barras de HP, escudo, status e log reagem aos eventos emitidos.
- Tooltip descreve intenção; números finais vêm do snapshot pós-resolução.

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

## 17. Catálogo de Moves de Classe (4 classes × 6 moves)

### Nome da Mecânica
Pool de Classe + Loadout Ativo (4 de 6)

### Definição Técnica
Cada classe (`IMPETUS`, `COGITOR`, `TUTATOR`, `DISSOLUTUS`) possui **6 moves** no catálogo (`CLASS_MOVE_POOL_SIZE`) e equipa **4** antes da batalha (`CLASS_ACTIVE_LOADOUT_SIZE`).

| Regra | Detalhe |
|-------|---------|
| Pool | 6 IDs únicos por classe em `classMovesetCatalog.ts` |
| Loadout ativo | 4 moves confirmados no painel de moveset (`globalPlayerStore`) |
| Loadout padrão | `CLASS_DEFAULT_ACTIVE_LOADOUT` em `moveGameplayRole.ts` |
| Cura canônica | 1 por classe (`CLASS_HEAL_MOVE_ID`) — **fora** dos 4 iniciais |
| Orçamento PP | Soma de `basePp` dos 4 slots (`loadoutPpBudget.ts`) |
| Validação | `normalizeClassActiveLoadout` — 4 IDs únicos, todos ∈ pool da classe |

#### Loadouts padrão (v1)

| Classe | 4 slots ativos | Reserva no pool (6) |
|--------|----------------|---------------------|
| **IMPETUS** | IMP_1 · IMP_2 · IMP_4 · IMP_6 | IMP_3 (cura) · IMP_5 (AOE) |
| **COGITOR** | COG_1 · COG_3 · COG_2 · COG_4 | COG_5 (cura) · COG_6 |
| **TUTATOR** | TUT_1 · TUT_6 · TUT_5 · TUT_2 | TUT_3 (cura) · TUT_4 |
| **DISSOLUTUS** | DIS_1 · DIS_5 · DIS_3 · DIS_2 | DIS_6 (cura) · DIS_4 |

Detalhe move a move, combos e tooltips completos: **[`CLASS-MOVES-KITS-v1.md`](./CLASS-MOVES-KITS-v1.md)**.

### Impacto na Lógica (Engine)
- Batalha recebe `equippedSkillIds` (4) → `moveIdsToSkillData` → `SkillData[]` enriquecido com `effectKind` + `effectParams`.
- `mergeLoadoutSkillsWithRuntime` preserva os 4 slots mesmo antes do snapshot do servidor.

### Impacto no Dashboard/Interface
- `MovesetLoadoutHUD` — deck building 6 → 4, confirmação antes do combate.
- Espelho de PP no sidebar (`resolveLoadoutPpBudget`).

---

## 18. Tooltips Oficiais de Move (4 linhas)

### Nome da Mecânica
Tooltip Narrativo Oficial (`ClassMoveNarrativeTooltip`)

### Definição Técnica
**SSOT de copy:** `src/shared/combat/classMoveNarrativeTooltips.ts`  
**Montagem UI:** `buildMoveTooltipLines` → `buildClassMoveNarrativeTooltipLines`

| Camada | Formato |
|--------|---------|
| **Título** | `{Nome} \| {Preparação \| Execução \| Suporte}` |
| **Narrativa** | 2 frases — identidade + efeito (sem números) |
| **Técnico** | `{base} \| {efeitos…} \| PP N \| Cooldown M.` |
| **Finalização** | 2 frases — timing + sinergia do kit |

#### Regras do técnico (obrigatórias)

- Sempre termina com `| PP N | Cooldown M.`
- Base: `Dano base X`, `Cura base X` ou `Dano base 0`
- Efeitos secundários **antes** de PP/Cooldown
- `Prioridade N` e `Alvo: …` só quando aplicável
- Helper canônico: `buildOfficialTechnicalLine(base, pp, cooldown, …effects)`

#### Categorias de tooltip (≠ `MoveCategory` do motor)

| Categoria UI | Uso |
|--------------|-----|
| **Preparação** | Setup, debuff, escudo, controle |
| **Execução** | Dano, burst, DoT, finishers |
| **Suporte** | Cura canônica da classe |

**Cobertura:** 24/24 moves de classe — validado em `classMoveNarrativeTooltips.test.ts`.

### Impacto na Lógica (Engine)
- Nenhum — copy é espelho; stats autoritativos permanecem no catálogo.

### Impacto no Dashboard/Interface
- `tooltipContent.ts` usa `formatClassMoveNarrativeTitle` + linhas narrativas.
- Cliente **nunca** inventa números; técnico espelha catálogo fechado na conversa de design.

---

## 19. `MoveEffectKind` — Identidade Mecânica

### Nome da Mecânica
Kind de Efeito (switch do motor)

### Definição Técnica
Enum em `classMovesetCatalog.ts`. Cada move de classe define **um** `effectKind` + `effectParams` opcionais.

| Kind | Papel resumido | Exemplo |
|------|----------------|---------|
| `PureDamage` | Dano direto | IMP_1 Golpe Direto |
| `AttackEcho` | Setup + eco % + crítico | IMP_2 Impulso Crescente |
| `ApplyBurn` | Dano + queimadura | IMP_4, TUT_6 |
| `AoeDamage` | Área + buff ATK | IMP_5 Varredura |
| `HighRiskBurst` | Burst + autodano | IMP_6 Fúria Suicida |
| `DebuffScalingDamage` | Dano × debuffs | COG_1 Execução Geométrica |
| `ApplyParalyze` | Paralisia + weaken buffs | COG_2 |
| `DelayedDetonation` | Chip + detonação ×N | COG_3 Mina |
| `MovesetWeaken` | −% dano/cura inimiga + marca | COG_4 Dreno |
| `LockEnemyMoves` | Bloqueia slots + debuff | COG_6 |
| `Heal` | Cura (+ eco/proc no catálogo) | IMP_3, COG_5, TUT_3, DIS_6 |
| `SelfShield` | Escudo % HP | TUT_2 Égide |
| `StatusImmunity` | Anti-debuff + DR | TUT_4 |
| `Thorns` | Reflect + buff ATK | TUT_5 |
| `RetaliationStrike` | Dano × dano recebido acumulado | TUT_1 |
| `IgnoreBarrier` | Ignora escudo/barreira | DIS_1 |
| `InvertDebuff` | −% dano inimigo | DIS_2 Paradoxo |
| `OutOfTurn` | Golpe prio alta | DIS_3 Dobra Temporal |
| `CopyLastMove` | Copia último move inimigo | DIS_4 Mímica |
| `Confuse` | Chip + confusão + residual | DIS_5 |

#### Lacunas motor × tooltip (v1 — documentar, não esconder)

| Move | Design (tooltip/catálogo) | Motor |
|------|---------------------------|-------|
| DIS_6 | 30% proc +40% cura extra | Proc ainda não wired no case `Heal` |
| DIS_2 | `swapDebuffCount` no catálogo | Só debuff −30% dano implementado |
| IMP_2 | Eco não gasta carga em cura/setup | Comportamento especial no eco |

### Impacto na Lógica (Engine)
- Novo move = nova entrada no catálogo + case (ou extensão) no `CombatEngine` + tooltip narrativo + testes.

### Impacto no Dashboard/Interface
- `formatMovePrimaryEffect` cobre fallback genérico; moves de classe usam narrativa oficial prioritariamente.

---

## 20. Contrato de duração — Tick por Ator (v0.4)

### Nome da Mecânica
Vida de status/modificadores/escudo medida pelo turno do **portador**, não pelo decremento global.

### Definição Técnica
- Cada `RuntimeStatus`, `RuntimeModifier` e `RuntimeShield` armazena `appliedAtTurn` (turno global na aplicação) e `turnsRemaining` como **duração fixa**.
- **Expiração:** no início do turno do portador, antes da ação, se `currentTurn >= appliedAtTurn + duration` (efeitos de janela) ou `currentTurn > appliedAtTurn + duration` (DoT: burn, confusão residual, eco de cura).
- **Ticks:** burn/residual/eco disparam em `prepareActorTurnStart` quando `currentTurn > appliedAtTurn` — nunca no turno da aplicação.
- **Detonação atrasada:** dispara no início do turno do portador quando `currentTurn >= appliedAtTurn + duration`.
- Removido: `decrementRuntimeDurations` global e hack `lockTurns + 1`.

Implementação: `runtimeActorTiming.ts`, `CombatEngine.prepareActorTurnStart`.

### Impacto na Lógica (Engine)
- COG_2 paralisia (1t) cobre o turno do alvo na aplicação; expira no início do turno seguinte dele.
- TUT_4 −50% dano: modifier de 1t cobre o turno inimigo após o cast defensivo.
- IMP_4/TUT_6 burn: ticks nos turnos seguintes do portador, não no cast.

### Impacto no Dashboard/Interface
- HUD exibe turnos restantes via `formatRuntimeStatusDisplayTurns(status, currentTurn)`.

---

# Mecânicas mencionadas superficialmente — confirmação necessária

As entradas abaixo **não** estão consolidadas o suficiente para constar como mecânica fechada neste GDD. Confirme se deseja que eu expanda cada uma em seção completa na v0.2.

| ID | Mecânica | Contexto no histórico | Status no código V2 |
|----|----------|----------------------|---------------------|
| **P1** | Seleção manual de alvo | Discussão implícita; Engine usa alvo por `moveTarget` | Alvo automático por kind; seleção manual pendente |
| **P2** | Cooldown de habilidades | Campo `cooldown` em `SkillData` | **Implementado** — catálogo + `skillCooldownUntilTurn` |
| **P3** | Idempotência por `requestId` | Comentário em `GameClient` | Sem deduplicação na Engine |
| **P4** | Passar turno (UI dedicada) | `skillId: null` suportado | Sem botão/fluxo UX definido |
| **P5** | Itens de combate | HUD legado (HABILIDADES / ITENS / PASSAR) | Poções reativas parciais V1.2; resto ausente |
| **P6** | `BATTLE_STATE_UPDATE` + paleta de skills | Protocolo cliente | **Implementado** via `mapEventsForClient` no `CombatGateway` |
| **P7** | Economia / Gateway / `WALLET_UPDATE` | Regras de arquitetura Altercadia | Fora do `src/` V2 atual |
| **P8** | Overworld / grid / dash 15×15 | Diretrizes de produto | Não implementado neste chat |
| **P9** | Áudio (master volume) | Ajuste em sessão anterior | Expurgado na migração |
| **P10** | Tipos de skill (heal/buff/debuff) | Histórico legado `damage` flat | **Resolvido** — `MoveEffectKind` + 24 moves + tooltips §18 |
| **P11** | Pipeline de iniciativa V1.2 no runtime | Baseline §16 | **Implementado** no `CombatEngine` |
| **P12** | Procs parciais (DIS_6, DIS_2 swap) | Tooltips vs motor | Parcial — ver tabela §19 |

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
| **MoveEffectKind** | Identidade mecânica do move — switch no motor (§19) |
| **Loadout ativo** | 4 moves equipados de um pool de 6 por classe (§17) |
| **Tooltip oficial** | Copy de 4 linhas em `classMoveNarrativeTooltips.ts` (§18) |

---

*Documento v0.4 — alinhado ao catálogo de moves de classe, tooltips narrativos e motor V1.2. Kits detalhados: [`CLASS-MOVES-KITS-v1.md`](./CLASS-MOVES-KITS-v1.md). Pendências: P1, P3–P5, P7–P9, P12.*

# Tooltips oficiais e kits por classe — v1

**Versão:** 1.0  
**Escopo:** 4 classes × 6 moves (pool) → 4 slots ativos + cura canônica fora do loadout padrão  
**Fonte de verdade (código):** `classMoveNarrativeTooltips.ts`, `classMovesetCatalog.ts`, `moveGameplayRole.ts`  
**GDD base (regras de combate):** [`GDD-MECANICAS-V2.md`](./GDD-MECANICAS-V2.md) — §17 (loadout), §18 (tooltips), §19 (`MoveEffectKind`)

---

## 1. Padrão do tooltip (UI)

Cada move exibe **4 linhas** no painel:

| Camada | Formato |
|--------|---------|
| **Título** | `{Nome do move} \| {Preparação \| Execução \| Suporte}` |
| **Narrativa** | 2 frases — identidade + efeito em linguagem de jogo (sem números) |
| **Técnico** | `{base} \| {efeitos…} \| PP N \| Cooldown M.` |
| **Finalização** | 2 frases — quando usar + sinergia do kit |

### Regras do técnico

- Sempre termina com `| PP N | Cooldown M.`
- Base: `Dano base X`, `Cura base X` ou `Dano base 0` (setups sem chip)
- Efeitos secundários **antes** de PP/Cooldown
- `Prioridade N` e `Alvo: …` só quando aplicável (prio ≠ 1 ou alvo não padrão)

### Categorias oficiais

| Categoria | Uso |
|-----------|-----|
| **Preparação** | Setup, debuff, escudo, controle — abre janela para payoff |
| **Execução** | Dano direto, burst, DoT ofensivo, finishers |
| **Suporte** | Cura canônica da classe (1 por classe, fora do loadout padrão) |

---

## 2. Regra de loadout

- **Pool:** 6 moves por classe (todos desbloqueados no catálogo)
- **Loadout ativo:** 4 slots confirmados antes da batalha
- **Cura canônica:** sempre no pool; **fora** dos 4 iniciais — troca manual no painel de moveset

Loadouts padrão definidos em `CLASS_DEFAULT_ACTIVE_LOADOUT`:

| Classe | Loadout padrão (4) | Fora do loadout (pool) |
|--------|--------------------|-------------------------|
| **IMPETUS** | Golpe Direto · Impulso Crescente · Lâmina Ardente · Fúria Suicida | Fôlego Impulsivo (cura) · Varredura de Impacto (AOE) |
| **COGITOR** | Execução Geométrica · Mina Dimensional · Sobrecarga Mental · Dreno Temporal | Recalibração Causal (cura) · Bloqueio Lógico |
| **TUTATOR** | Retribuição · Surto Tectônico · Casca de Espinhos · Égide de Volts | Pulso Vital (cura) · Campo Isolante |
| **DISSOLUTUS** | Ruptura Dimensional · Distorção Cognitiva · Dobra Temporal · Paradoxo | Instabilidade Quântica (cura) · Mímica de Frequência |

---

## 3. IMPETUS — pressão ofensiva (STR)

**Fantasia:** golpes diretos, impulso crescente e finishers de risco. Escala com **Força (STR)**.

### Loadout padrão e loop

```
Impulso Crescente → Golpe Direto / Lâmina Ardente → (ticks de burn) → Fúria Suicida
```

1. **Impulso Crescente** — setup sem dano; eco +15% nos 2 próximos golpes ofensivos +5% crítico  
2. **Golpe Direto** ou **Lâmina Ardente** — pressão constante ou DoT  
3. Repetir pressão entre ticks de queimadura  
4. **Fúria Suicida** — finisher quando HP permitir o recuo (35% do dano causado)

### Moves (tooltips oficiais)

#### Golpe Direto | Execução (`IMP_1`)
- **Narrativa:** Golpe direto e confiável. Referência de pressão da classe — sem setup.
- **Técnico:** Dano base 15 | PP 8 | Cooldown 1.
- **Finalização:** Use para manter ritmo entre bursts. Encadeie com Impulso Crescente antes de Lâmina ou Fúria.

#### Impulso Crescente | Preparação (`IMP_2`)
- **Narrativa:** Prepara o impulso ofensivo. Eco nos próximos golpes e precisão elevada — sem dano imediato.
- **Técnico:** Dano base 0 | Eco +15% do golpe escolhido (2 turnos; não renova se reusar) | +5% crítico | PP 12 | Cooldown 1.
- **Finalização:** Ative antes de Golpe Direto ou Lâmina. Cura no turno do eco não gasta carga; reusar Impulso não renova o eco.

#### Fôlego Impulsivo | Suporte (`IMP_3`) — *fora do loadout*
- **Narrativa:** Recuperação rápida em si. Sustenta a pressão sem quebrar o ritmo ofensivo.
- **Técnico:** Cura base 10 | PP 8 | Cooldown 2.
- **Finalização:** Use com HP baixo entre golpes. Poção reativa no mesmo turno combina; cure antes do finisher se ainda for agredir.

#### Lâmina Ardente | Execução (`IMP_4`)
- **Narrativa:** Golpe incendiário. Dano imediato e queimadura nos turnos seguintes.
- **Técnico:** Dano base 16 | Queimadura 5% HP/turno (3 turnos) | PP 5 | Cooldown 2.
- **Finalização:** Aplique cedo para maximizar o DoT. Alterne com Golpe Direto e Impulso entre os ticks de burn.

#### Varredura de Impacto | Execução (`IMP_5`) — *fora do loadout*
- **Narrativa:** Impacto em área. Atinge todos os inimigos e deixa impulso ofensivo residual.
- **Técnico:** Dano base 14 | AOE ×0,85 por alvo | +5% ATK (2 turnos) | PP 8 | Cooldown 2.
- **Finalização:** Priorize em PvE multi-alvo. O buff modesto prepara Golpe Direto ou burst nos turnos seguintes.

#### Fúria Suicida | Execução (`IMP_6`)
- **Narrativa:** Finisher de altíssimo impacto. O recuo atravessa você na mesma hora.
- **Técnico:** Dano base 30 | Autodano 35% do dano causado | PP 6 | Cooldown 3.
- **Finalização:** Use só quando sobreviver ao recuo. Combina com Fôlego Impulsivo se o HP apertar depois.

### Trocas sugeridas

| Situação | Troca |
|----------|-------|
| PvE multi-alvo | Golpe Direto → **Varredura de Impacto** |
| HP instável pós-finisher | Slot qualquer → **Fôlego Impulsivo** |
| Burst seguro | Impulso → Lâmina → Golpe (eco) → Fúria |

---

## 4. COGITOR — setup e finalizador (CRIT)

**Fantasia:** debuffs empilhados, controle mental e **Execução Geométrica** como payoff. Escala com **Crítico (CRIT)**.

### Loadout padrão e loop

```
Sobrecarga Mental / Dreno Temporal → Mina Dimensional (turno 0) → … debuffs … → Execução Geométrica
```

1. Aplicar **2–3 debuffs** cedo (Sobrecarga, Dreno, Bloqueio se equipado)  
2. **Mina Dimensional** no turno 1 — detonação ×3 após 2 turnos (independe dos debuffs)  
3. **Execução Geométrica** quando debuffs estiverem ativos (+12% por debuff, máx. 3)

### Moves (tooltips oficiais)

#### Execução Geométrica | Execução (`COG_1`)
- **Narrativa:** Golpe de precisão que explora fraquezas. Quanto mais debuffs no alvo, maior o dano.
- **Técnico:** Dano base 18 | +12% por debuff ativo (máx. 3) | PP 12 | Cooldown 1.
- **Finalização:** Solte após as Preparações. Cada debuff amplia este finalizador.

#### Sobrecarga Mental | Preparação (`COG_2`)
- **Narrativa:** Sobrecarga mental no alvo. Paralisa o turno dele e enfraquece os buffs inimigos.
- **Técnico:** Dano base 0 | Paralisia 60% (1 turno) | Buffs inimigos −20% (3 turnos) | PP 10 | Cooldown 2.
- **Finalização:** Aplique antes da Execução Geométrica. Conta como debuff no finalizador.

#### Mina Dimensional | Preparação (`COG_3`)
- **Narrativa:** Golpe fraco agora, detonação forte depois. Marca o alvo com ameaça por 2 turnos.
- **Técnico:** Dano base 12 | Detonação ×3 após 2 turnos | PP 8 | Cooldown 3.
- **Finalização:** Use cedo no combate. Planeje o turno da detonação — não depende dos debuffs da Execução Geométrica.

#### Dreno Temporal | Preparação (`COG_4`)
- **Narrativa:** Drena o alvo e debilita o kit dele. Marca permanente que conta como debuff.
- **Técnico:** Dano base 8 | −15% dano e cura inimiga (3 turnos) | Marca debilitamento (permanente; conta como debuff) | PP 10 | Cooldown 2.
- **Finalização:** Aplique cedo, antes da Execução Geométrica. Enfraquece o kit agora e expõe o alvo ao finalizador.

#### Recalibração Causal | Suporte (`COG_5`) — *fora do loadout*
- **Narrativa:** Recalibração causal. Cura imediata e eco de cura nos turnos seguintes.
- **Técnico:** Cura base 18 | Eco +10% da cura base (2 turnos) | PP 8 | Cooldown 2.
- **Finalização:** Use quando o HP apertar. Cure entre Preparações — não gaste o turno da Execução Geométrica recuperando vida.

#### Bloqueio Lógico | Preparação (`COG_6`) — *fora do loadout*
- **Narrativa:** Trava a lógica inimiga. Bloqueia moves no próximo turno dele e aplica debilitamento.
- **Técnico:** Dano base 0 | Bloqueia 2 moves (1 turno) | −15% dano e cura inimiga (2 turnos) | Conta como debuff | PP 6 | Cooldown 3.
- **Finalização:** Use antes da Execução Geométrica. Quebra combo e empilha debuff com Dreno Temporal e Sobrecarga Mental.

### Trocas sugeridas

| Situação | Troca |
|----------|-------|
| Inimigo com combo previsível | Mina → **Bloqueio Lógico** |
| Sustain necessário | Slot de setup → **Recalibração Causal** |
| Burst máximo | Dreno + Sobrecarga + Bloqueio → Execução (3 debuffs = +36%) |

---

## 5. TUTATOR — tanque retaliador (DEF)

**Fantasia:** absorver dano, refletir impacto e soltar **Retribuição** carregada. Escala com **Defesa (DEF)**.

### Loadout padrão e loop

```
Égide / Casca de Espinhos (prio 3) → tank hits → Retribuição · Surto Tectônico
```

1. **Casca de Espinhos** (prio 3) antes do turno inimigo — reflect 50% + buff ATK por hit  
2. **Égide** para absorver sequências pesadas  
3. Acumular dano recebido (+1% ATK / 10 dmg, máx. +30%)  
4. **Retribuição** no seu turno — zera acúmulo; alternar com **Surto Tectônico** (DoT)

### Moves (tooltips oficiais)

#### Retribuição de Impacto | Execução (`TUT_1`)
- **Narrativa:** Golpe de retaliação acumulada. Quanto mais dano você levou, mais forte ao soltar.
- **Técnico:** Dano base 16 | +1% ATK a cada 10 de dano recebido (máx. +30%) | PP 12 | Cooldown 1.
- **Finalização:** Tank hits nos turnos do inimigo e solte no seu turno — zera o acúmulo. Planeje Égide ou Espinhos antes de Retribuição.

#### Égide de Volts | Preparação (`TUT_2`)
- **Narrativa:** Camada elétrica absorvente. Protege o HP e compra tempo para acumular fúria.
- **Técnico:** Dano base 0 | Escudo 20% HP máx. (2 turnos) | PP 10 | Cooldown 2.
- **Finalização:** Use antes de sequências inimigas. Combina com Casca de Espinhos — dano que passar alimenta Retribuição.

#### Pulso Vital | Suporte (`TUT_3`) — *fora do loadout*
- **Narrativa:** Pulso de cura defensiva. Sustenta si ou aliado em combates prolongados.
- **Técnico:** Cura base 18 | Alvo: Si ou aliado | PP 10 | Cooldown 2.
- **Finalização:** Fora do loadout padrão — troque quando precisar de sustain. Poção reativa no mesmo turno combina com outro move.

#### Campo Isolante | Preparação (`TUT_4`) — *fora do loadout*
- **Narrativa:** Isola o corpo de debuffs e endurece a pele. Protege o setup enquanto o inimigo pressiona.
- **Técnico:** Dano base 0 | Bloqueia debuffs (2 turnos) | −50% dano recebido (1 turno) | PP 8 | Cooldown 3.
- **Finalização:** Use contra kits de controle. Combine com Égide antes de janelas perigosas — não substitui escudo de absorção.

#### Casca de Espinhos | Preparação (`TUT_5`)
- **Narrativa:** Espinhos voltados ao agressor. Devolve metade do dano e converte impacto em pressão ofensiva.
- **Técnico:** Dano base 0 | Prioridade 3 | Reflete 50% dano (2 turnos) | +15% ATK (2 turnos) por reflect | PP 8 | Cooldown 2.
- **Finalização:** Ative antes do inimigo bater. Cada hit devolvido buffa ATK — encadeie com Retribuição ou Surto Tectônico.

#### Surto Tectônico | Execução (`TUT_6`)
- **Narrativa:** Golpe tectônico fissurante. Impacto imediato e desgaste de HP nos turnos seguintes.
- **Técnico:** Dano base 20 | Queimadura 4% HP/turno (3 turnos) | PP 8 | Cooldown 2.
- **Finalização:** Pressão ofensiva da classe. Use cedo e alterne com Retribuição quando a fúria estiver carregada.

### Trocas sugeridas

| Situação | Troca |
|----------|-------|
| Kit de controle/debuff | Égide → **Campo Isolante** |
| Sustain / co-op | Surto → **Pulso Vital** |
| DPS máximo | Égide → Espinhos → tank → Retribuição (+30%) → Surto |

---

## 6. DISSOLUTUS — distorção e ruptura (CRIT / AGI)

**Fantasia:** debilitar percepção, cortar defesas e interromper ritmo inimigo. **Dobra Temporal** como interruptor (prio 3). Escala mista: **CRIT** nos setups, **AGI** na Dobra.

### Loadout padrão e loop

```
Paradoxo / Distorção Cognitiva → Dobra Temporal (interrupt) → Ruptura Dimensional
```

1. **Paradoxo** — −30% dano inimigo (3 turnos); conta como debuff  
2. **Distorção Cognitiva** — chip + confusão 45% + residual 10% HP máx./turno  
3. **Dobra Temporal** (prio 3) — bater antes de moves lentos do inimigo  
4. **Ruptura Dimensional** — burst que ignora 100% escudo/barreira

### Moves (tooltips oficiais)

#### Ruptura Dimensional | Execução (`DIS_1`)
- **Narrativa:** Corte dimensional contra defesas. Ignora barreiras e golpeia o HP por trás do escudo.
- **Técnico:** Dano base 20 | Ignora 100% escudo/barreira | PP 8 | Cooldown 2.
- **Finalização:** Use contra tanques e setups defensivos. Referência de burst — combina com Distorção antes do finisher.

#### Paradoxo | Preparação (`DIS_2`)
- **Narrativa:** Paradoxo defensivo no alvo. Corta a força dos próximos ataques inimigos.
- **Técnico:** Dano base 0 | Debuff −30% dano inimigo (3 turnos) | PP 8 | Cooldown 2.
- **Finalização:** Aplique antes da sequência ofensiva dele. Conta como debuff — combina com Dobra Temporal e Distorção Cognitiva.

#### Dobra Temporal | Execução (`DIS_3`)
- **Narrativa:** Dobra o tempo por um instante. Golpe reativo que tende a agir antes de moves lentos.
- **Técnico:** Dano base 14 | Prioridade 3 | PP 12 | Cooldown 3.
- **Finalização:** No loadout padrão como interruptor. Use quando precisar bater antes do move prio 1 do inimigo.

#### Mímica de Frequência | Preparação (`DIS_4`) — *fora do loadout*
- **Narrativa:** Copia a última skill do alvo. Devolve o golpe enfraquecido e desestabiliza o kit dele.
- **Técnico:** Dano base 0 | Copia último move inimigo (90% poder) | −15% eficácia inimiga (2 turnos) | PP 8 | Cooldown 2.
- **Finalização:** Use depois que o inimigo revelar o golpe. Sem último move registrado, só aplica o debilitamento.

#### Distorção Cognitiva | Preparação (`DIS_5`)
- **Narrativa:** Distorce a percepção do alvo. Chip imediato, chance de falhar e desgaste enquanto confuso.
- **Técnico:** Dano base 10 | Confusão 45% falha de turno | Dano residual 10% HP máx./turno (2 turnos) | PP 8 | Cooldown 2.
- **Finalização:** Aplique cedo em alvos agressivos. Encadeie com Ruptura Dimensional enquanto ele erra movimentos.

#### Instabilidade Quântica | Suporte (`DIS_6`) — *fora do loadout*
- **Narrativa:** Cura instável em si. Recuperação modesta com chance de surto quântico extra.
- **Técnico:** Cura base 16 | 30% chance de +40% cura extra | PP 10 | Cooldown 2.
- **Finalização:** Cura canônica fora do loadout padrão. Use quando o HP apertar entre distorções e rupturas.

### Trocas sugeridas

| Situação | Troca |
|----------|-------|
| Inimigo repetindo mesmo move | Paradoxo → **Mímica de Frequência** |
| HP baixo | Dobra → **Instabilidade Quântica** |
| Anti-tanque | Distorção (confusão) → Ruptura (ignora escudo) |

---

## 7. Referência rápida — cura canônica

| Classe | Move | Cura base | PP | CD |
|--------|------|-----------|----|----|
| IMPETUS | Fôlego Impulsivo | 10 | 8 | 2 |
| COGITOR | Recalibração Causal | 18 (+ eco 10% × 2t) | 8 | 2 |
| TUTATOR | Pulso Vital | 18 (si/aliado) | 10 | 2 |
| DISSOLUTUS | Instabilidade Quântica | 16 (30% +40%) | 10 | 2 |

---

## 8. Notas de implementação (motor)

Itens ainda não wired ou parciais no `CombatEngine` — tooltips já descrevem o design alvo:

| Move | Nota |
|------|------|
| **DIS_6** Instabilidade Quântica | Proc `bonusHealChancePercent` (+40% cura) ainda não aplicado no case `Heal` |
| **DIS_2** Paradoxo | `swapDebuffCount` no catálogo não implementado; só debuff −30% dano |
| **IMP_2** Impulso Crescente | Eco não gasta carga em cura/setup; reusar não renova cargas |

---

## 9. Manutenção

Ao alterar stats ou copy de um move:

1. Atualizar `classMovesetCatalog.ts` (stats autoritativos)
2. Atualizar `classMoveNarrativeTooltips.ts` via `buildOfficialTechnicalLine()`
3. Rodar `npm test` — suites `classMoveNarrativeTooltips.test.ts` e `moveTooltipContent.catalog.test.ts`
4. Sincronizar este documento e [`GDD-MECANICAS-V2.md`](./GDD-MECANICAS-V2.md) (§17–§19) se loadout padrão ou combos mudarem

**Arquivo de código:** `src/shared/combat/classMoveNarrativeTooltips.ts`  
**Loadouts padrão:** `src/shared/combat/moveGameplayRole.ts` → `CLASS_DEFAULT_ACTIVE_LOADOUT`

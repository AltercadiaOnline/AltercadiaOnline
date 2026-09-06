# Moveset — dinâmica por classe (ordem > spam)

Design fechado em workshop (produto). Motor continua autoritativo; cliente só espelha.
Não substitui [combate.md](combate.md) / [combate-pve.md](combate-pve.md) / [combate-pvp.md](combate-pvp.md).
Progressão de domínio: [progressao-pets-quests.md](progressao-pets-quests.md).

## Objetivo

- Timing + ordem + combinação do kit > spam do mesmo golpe.
- Bolsa da Ficha (ATK/DEF/vida) ainda importa, **menos** que moveset bem jogado.
- Underdog (ex. L15 vs L30): chance via **skill de kit**, não equalizer de nível.
- **PvP e PvE iguais** na lógica de ordem (exceção: chip Tutator um pouco mais forte no PvE).
- Anti-spam e setups são **por classe** (originalidade).
- Janelas/marcas/cargas: **HUD explícita** (jogador e oponente leem o risco).

## Arquivos âncora (implementação)

| Peça | Path |
|------|------|
| Catálogo | `src/shared/combat/classMovesetCatalog.ts` |
| Loadout default | `src/shared/combat/moveGameplayRole.ts` (`CLASS_DEFAULT_ACTIVE_LOADOUT`) |
| Papéis / pool | `movesetLoadout.ts` |
| Efeitos no motor | `src/server/engine/CombatEngine.ts` |
| Status runtime | `src/shared/combat/runtimeStatusCatalog.ts` / `src/shared/types/combat.ts` |
| Dano | `src/shared/combat/calculateDamage.ts` |
| Tooltips | `moveTooltipContent.ts` / `classMoveNarrativeTooltips.ts` |
| Domínio | `src/shared/progression/moveCombatScaling.ts` |

## Regras transversais

1. Setup → payoff (janela/marca/carga) com UI clara.
2. Anti-spam **leve/médio por classe** — não regra global única.
3. Resposta ao oponente (interrupt, lock, imunidade, ignore barreira) = identidade.
4. Oponente pode **atenuar de forma leve** janelas do rival (não cancelar de graça).
5. Não calcular ordem/dano no cliente.

## Impetus — ritmo → finisher

| ID | Nome (UI) | Papel | Notas |
|----|-----------|--------|------|
| `IMP_4` | Lâmina Ardente | Setup **barato** | Janela finisher **1** turno |
| `IMP_2` | Preparo de Impulso | Setup **caro** | Janela **2**; bônus focado no finisher (não no spam) |
| `IMP_6` | Fúria Suicida | Finisher | Pico na janela; autodano **reduzido** na janela (não zero) |
| `IMP_3` | Fôlego Divino | Util / cura | No default |
| `IMP_1` | Golpe de Pressão | Pressão | Pool; anti-spam **médio** se repetir |
| `IMP_5` | Romper Postura | Util ofensivo | Pool; reescrever (quebra guarda / atrapalhar janela rival); não só AoE |

**Default:** `IMP_4, IMP_2, IMP_3, IMP_6`  
**Anti-spam:** médio no golpe de pressão.

## Cogitor — marcas → execução + tempo

| ID | Nome (UI) | Papel | Notas |
|----|-----------|--------|------|
| `COG_4` | Dreno Temporal | Preparador barato | Marca rápida + weaken; anti-spam se só spammar |
| `COG_3` | Mina Dimensional | Payoff temporal | Mina; timer HUD; oponente atenua leve |
| `COG_1` | Execução Geométrica | Payoff de marcação | Sem debuffs = mediocre; 2–3 marcas = pico; HUD conta marcas |
| `COG_5` | Recalibração Causal | Util / cura | No default |
| `COG_2` | Sobrecarga Mental | Controle | Pool; para ~**20%**; marca pra Execução |
| `COG_6` | Bloqueio Lógico | Negação premium | Pool; trava moves; CD alto (anti-Impetus) |

**Default:** `COG_4, COG_3, COG_1, COG_5`  
**Anti-spam:** Execução fraca sem setup + mesmo debuff repetido rende menos.

## Tutator — muro → retribuição

| ID | Nome (UI) | Papel | Notas |
|----|-----------|--------|------|
| `TUT_5` | Casca de Espinhos | Setup defensivo **barato/ativo** | Espinhos; HUD “ligado” |
| `TUT_2` | Escudo de Alter | Setup defensivo **caro** | Escudo mais forte / CD maior |
| `TUT_1` | Retribuição de Impacto | Payoff | HUD carga; sem carga mediocre; gasta ao usar |
| `TUT_3` | Pulso Vital | Util híbrido | Cura + escudo leve ou limpa 1 debuff; no default |
| `TUT_6` | Surto Tectônico | Chip | Pool; dano imediato baixo + Burn; carga **leve** pra Retribuição; **PvE um pouco mais forte** |
| `TUT_4` | Campo Isolante | Resposta premium | Pool; imunidade debuff; DR afinado (<50% bruto) |

**Default:** `TUT_5, TUT_2, TUT_1, TUT_3`  
**Anti-spam:** leve nos muros (só escudo/espinhos sem revidar rende menos).  
**Solo:** pico ao tomar hit / Retribuição — não ATK alto.

## Dissolutus — caos/mímica → ruptura (≠ Cogitor)

| ID | Nome (UI) | Papel | Notas |
|----|-----------|--------|------|
| `DIS_2` | Paradoxo Infernal | Setup barato | −dano inimigo; afinar %/duração |
| `DIS_4` | Mímica de Frequência | Caos central | Mímica; cópia ~75–80%; arma janela Ruptura; no default |
| `DIS_3` | Dobra Temporal | Reação + setup | Age antes + marca janela Ruptura |
| `DIS_1` | Ruptura Dimensional | Finisher anti-tank | Ignore barreira **parcial** fora da janela; **100%** com setup |
| `DIS_5` | Distorção Cognitiva | Caos (pool) | Confusão ~20–25% falha (não 45%) |
| `DIS_6` | Instabilidade Quântica | Heal (pool) | Exceção: heal **fora** do default pra caber o loop de caos |

**Default:** `DIS_2, DIS_4, DIS_3, DIS_1`  
**Anti-spam:** Ruptura sem setup mediocre + não spammar o mesmo caos.

## Contrastes (meta)

| Classe | Preparação | Payoff |
|--------|------------|--------|
| Impetus | Janela **em si** | Fúria |
| Cogitor | Marcas **no alvo** + timer | Execução / Mina |
| Tutator | Muro / espinhos | Retribuição (carga) |
| Dissolutus | Caos / cópia / tempo | Ruptura (ignore escudo) |

## Proibido

- Equalizer de HP/nível como substituto desta ficha.
- Combo tags idênticas pra todas as classes.
- Calcular janela/carga/dano no cliente.
- Implementar as 4 classes de uma vez sem piloto (Impetus primeiro no código).

## Ordem de implementação sugerida

1. Impetus (piloto) + HUD de janela — **no motor** (`FINISHER_WINDOW`, defaults, Fúria na janela)
2. Cogitor (marcas + mina UI)
3. Tutator (carga Retribuição UI)
4. Dissolutus (mímica + ignore condicional)
5. Ajuste fino Ficha vs moveset (números)

## Checklist merge

1. Defaults em `CLASS_DEFAULT_ACTIVE_LOADOUT` batem com esta ficha?
2. Efeitos no `CombatEngine` batem com os papéis?
3. HUD mostra janela/marca/carga pro oponente?
4. PvE ensina a mesma ordem (exceto chip Tutator)?

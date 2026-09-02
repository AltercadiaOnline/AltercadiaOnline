# Quadro de Agente — Cronograma de implementação (15 quests)

**Status:** tubo Fase 0 + **Q1 jogável** · Q2–Q15 catálogo/HUD, POIs pendentes  
**Ficha-mãe:** [progressao-pets-quests.md](progressao-pets-quests.md)  
**Chat:** anexar `@docs/context/mercenary-quests-cronograma.md` + ficha-mãe ao pedir a próxima quest.

---

## 0. O que já existe (MVP piloto)

| Peça | Estado |
|------|--------|
| Aceitar / abandonar / completar no NPC Mercenário | OK |
| 1 slot ativo · XP + VOLTS no Completar | OK |
| Catálogo 15 quests | HUD + lore do cronograma |
| Passos no mundo (`step`) | **Q1 só** (`MERCENARY_QUEST_INTERACT` + operário cidade) |
| Itens de quest no inventário | **Q1:** `codigo_desbloqueio` (grant/strip/consume) |
| POIs / contacts no mapa | **Q1:** `operario_linha4#0` em `city_01`. Q2–Q15 ainda sem alvo. |

**Padrão-alvo de toda quest:**

```text
Quadro (ACCEPT) → POI no mapa (step + interação) → item/flag no progresso
→ voltar ao Quadro (COMPLETE) → XP + VOLTS
```

Cliente só espelha. Steps, inventário de quest e recompensa = servidor (`ActionDispatcher` / handlers / `economyGateway`).

---

## 1. Resposta direta: itens e NPCs?

**Sim.** Quase toda quest precisa de **ao menos um** destes:

| Tipo | Para quê | Onde cadastrar (quando for a vez) |
|------|----------|-----------------------------------|
| **Itens de missão** | Chave, recibo, amostra, pendrive… no inventário até entregar | Catálogo de itens + grant via `economyGateway` (não seed no boot) |
| **POIs / markers** | Terminal, beco, telhado, praça, alfândega, doca, cofre… | Marker Construct + placements gerados + registry de interação |
| **NPCs / contacts** | Operário escondido, receptador, contrabandista (rescate) | `npcRegistry` + sprite bundle (se for personagem) **ou** prop/terminal interativo |
| **Mini-UX de step** | Cabos/cores, slider de frequência, cofre numérico, QTE | Painel React leve ou overlay — sem cálculo de reward no client |

NPC **Mercenário** (`mercenario`) continua sendo o Quadro (accept/complete). Os outros são **alvos de mundo**, não necessariamente vendedores.

---

## 2. Faixas (design novo — substitui piloto)

| Faixa | Níveis | Tema |
|------:|--------|------|
| 1 | **1–10** | Despertar no Submundo |
| 2 | **11–20** | Operações no Asfalto |
| 3 | **21–30** | Infiltração Profunda |

> Piloto antigo era 1–10 / 11–30 / 31–50. **Usar esta tabela** no catálogo novo.

---

## 3. Fases de engenharia (ordem obrigatória)

### Fase 0 — Fundação (antes da Quest 1)

Fazer **uma vez**; desbloqueia Q1…Q15.

- [x] Novo schema de progresso (`activeQuestId`, `completedQuestIds`, `step`, flags / item de turn-in)
- [x] Estender `mercenaryQuestTypes` + `mercenaryQuestProgress` (sanitize/accept/complete)
- [x] Catálogo: ids, titles, bands 1–10 / 11–20 / 21–30, `step` canônico por quest
- [x] Intent de mundo: `MERCENARY_QUEST_INTERACT`
- [x] Handler server: quest ativa + step + mapa/raio → grant item
- [x] Tracker Hub: step atual + objetivo curto
- [x] `COMPLETE` só se `readyToTurnIn` + item no inventário
- [x] Persistência: slice `mercenaryQuests` no `CharacterPersistenceRecord`

**Não** implementar as 15 mecânicas na Fase 0 — só o tubo.

### Fase 1 — Quests 1–5 (mapa + interact simples)

Prioridade: **um POI → interact → item/flag → turn-in**.

### Fase 2 — Quests 6–10 (+ mini-UX)

Cabos, frequência, QTE de amostra — reutilizar padrão de interact da Fase 1.

### Fase 3 — Quests 11–15 (variantes + cofre/fusíveis)

Variantes de steps já existentes + `CRACK_SAFE` / `RESTORE_POWER`.

### Por quest (checklist curto)

1. Entry no catálogo (id, lore, step, rewards)
2. Item(ns) no catálogo de itens (se houver)
3. Marker/POI Construct + id de interact
4. Handler valida step → grant item / avança step
5. Tracker + board strings
6. `deploy:check` · smoke: accept → POI → complete

---

## 4. Catálogo canônico (lore + mecânica + assets)

### Faixa 1 — Nv 1–10 · Despertar no Submundo

#### Q1 — Sinal Fantasma na Linha 4
| Campo | Valor |
|-------|--------|
| **Step** | `SCAN_TERMINAL` |
| **Lore** | Operário com implante travado após vazamento da diretoria; escondido na estação de metrô da cidade. |
| **Gameplay** | Aceita no Quadro → Operário da Linha 4 na estação da cidade (~371, 124) → **Extrair código** → `codigo_desbloqueio` → Completar no Mercenário. Sem terminal POI. Operários do beco = diálogo só. |
| **Item** | `codigo_desbloqueio` |
| **POI / visual** | Estação na cidade (layout `cidade_01`) |
| **NPC?** | **Sim** — `operario_linha4#0` em `city_01` (alvo). Instâncias `#1–#3` no beco = decoração. |
| **Status** | **Jogável** (Q1 only; Q2–Q15 ainda sem POI) |

#### Q2 — O Contrabandista de Cripto-Chaves
| Campo | Valor |
|-------|--------|
| **Step** | `RESCUE_CONTACT` |
| **Lore** | Traficante de hardware pego por capangas; carrega chaves-mestre dos distritos. |
| **Gameplay** | Beco → resgata contact → `chave_mestre` no inventário → Quadro. |
| **Item** | `chave_mestre` |
| **POI / visual** | Beco estreito, caixotes, fumaça de bueiro |
| **NPC?** | **Sim** — contact/contrabandista (interact de rescue) |
| **Status** | Pendente |

#### Q3 — A Varredura no Telhado
| Campo | Valor |
|-------|--------|
| **Step** | `RETRIEVE_DRONE` |
| **Lore** | Drone corporativo caiu no telhado com mapa de patrulha. |
| **Gameplay** | Sobe ao telhado → destroços do drone → `mapa_patrulha` → Quadro. |
| **Item** | `mapa_patrulha` |
| **POI / visual** | Telhado industrial, ventilação, drone fumegante |
| **NPC?** | Não (prop/interact) |
| **Status** | Pendente |

#### Q4 — Limpeza de Cache no Distrito Comercial
| Campo | Valor |
|-------|--------|
| **Step** | `INJECT_VIRUS` |
| **Lore** | Totens de propaganda espalham lavagem cerebral; resistência quer vírus. |
| **Gameplay** | 3 terminais na praça (sequência) → todos limpos → Quadro. |
| **Item** | Nenhum (ou vírus consumível one-shot — decidir na implementação) |
| **POI / visual** | Praça + 3 totens holográficos |
| **NPC?** | Não (3 POIs) |
| **Status** | Pendente |

#### Q5 — O Último Carreto do Subsolo
| Campo | Valor |
|-------|--------|
| **Step** | `STEAL_BATTERIES` |
| **Lore** | Baterias de alta densidade apreendidas na alfândega; essenciais aos esconderijos. |
| **Gameplay** | Zona demarcada → contêiner → `baterias_alta_densidade` → Quadro. |
| **Item** | `baterias_alta_densidade` |
| **POI / visual** | Posto alfândega, grades, strobes amarelos |
| **NPC?** | Não (zona + contêiner) |
| **Status** | Pendente |

---

### Faixa 2 — Nv 11–20 · Operações no Asfalto

#### Q6 — O Recibo Queima-Mão
| Campo | Valor |
|-------|--------|
| **Step** | `SCAN_TERMINAL` |
| **Lore** | Burocrata Vórtex extorquia comerciante; terminal abandonado na calçada. |
| **Gameplay** | Quiosque → `recibo_extorsao` → Quadro. |
| **Item** | `recibo_extorsao` |
| **POI / visual** | Quiosque murado, telas quebradas |
| **NPC?** | Não |
| **Status** | Pendente |

#### Q7 — O Servidor Fantasma do Distrito 4
| Campo | Valor |
|-------|--------|
| **Step** | `DISCONNECT_CABLES` |
| **Lore** | Nó clandestino Vórtex em fachada abandonada processando dados financeiros. |
| **Gameplay** | Painel lateral → sequência de cores nos cabos → `modulo_memoria` → Quadro. |
| **Item** | `modulo_memoria` |
| **POI / visual** | Vitrine empoeirada + gabinete industrial |
| **NPC?** | Não · **mini-UX** cabos/cores |
| **Status** | Pendente |

#### Q8 — O Terminal da Docagem Clandestina
| Campo | Valor |
|-------|--------|
| **Step** | `TUNE_FREQUENCY` |
| **Lore** | Vórtex desova refugo tóxico; Static quer manifesto. |
| **Gameplay** | Doca → slider de frequência → `manifesto_cargas` → Quadro. |
| **Item** | `manifesto_cargas` |
| **POI / visual** | Plataforma, guindastes, contêineres |
| **NPC?** | Não · **mini-UX** sintonizar |
| **Status** | Pendente |

#### Q9 — O Relógio de Ouro de Alguém Importante
| Campo | Valor |
|-------|--------|
| **Step** | `FETCH_WATCH` |
| **Lore** | Relógio de executivo Vórtex (chaves criptografadas) com receptador. |
| **Gameplay** | Ponto no mapa → receptador → `relogio_ouro` → Quadro. |
| **Item** | `relogio_ouro` |
| **POI / visual** | Mesa improvisada em beco |
| **NPC?** | **Sim** — receptador |
| **Status** | Pendente |

#### Q10 — Carga Jurássica
| Campo | Valor |
|-------|--------|
| **Step** | `EXTRACT_SAMPLE` |
| **Lore** | Carga viva experimental; Static quer amostra genética. |
| **Gameplay** | Caminhão corporativo → QTE / tempo de resposta → `amostra_biologica` → Quadro. |
| **Item** | `amostra_biologica` |
| **POI / visual** | Veículo grande, luzes vermelhas, marcas de garras |
| **NPC?** | Não · **mini-UX** extract |
| **Status** | Pendente |

---

### Faixa 3 — Nv 21–30 · Infiltração Profunda

#### Q11 — O Recibo Queima-Mão (Variante de Distrito)
| Campo | Valor |
|-------|--------|
| **Step** | `LOCATE_TERMINAL` |
| **Lore** | Docs ilícitos Vórtex em terminal de autoatendimento em beco movimentado. |
| **Gameplay** | Terminal → `documentos_sigilosos` → Quadro. |
| **Item** | `documentos_sigilosos` |
| **POI / visual** | Terminal blindado na fachada |
| **NPC?** | Não (reusa família SCAN/LOCATE) |
| **Status** | Pendente |

#### Q12 — O Servidor Fantasma (Variante Avançada)
| Campo | Valor |
|-------|--------|
| **Step** | `DISABLE_NODE` |
| **Lore** | Nó secundário transmite vigilância civil de armazém desativado. |
| **Gameplay** | Painel → ordem dos relés → `unidade_transmissora` → Quadro. |
| **Item** | `unidade_transmissora` |
| **POI / visual** | Armazém escuro, servidores azuis |
| **NPC?** | Não · mini-UX ordem de relés |
| **Status** | Pendente |

#### Q13 — O Terminal da Docagem (Variante de Baía)
| Campo | Valor |
|-------|--------|
| **Step** | `ACCESS_PORT_TERMINAL` |
| **Lore** | Rotas das barcaças de lixo tóxico no console portuário. |
| **Gameplay** | Porto → sintoniza canal → `registros_rota` → Quadro. |
| **Item** | `registros_rota` |
| **POI / visual** | Cais úmido, guindastes |
| **NPC?** | Não (variante Q8) |
| **Status** | Pendente |

#### Q14 — O Cofre do Gerente Intermediário
| Campo | Valor |
|-------|--------|
| **Step** | `CRACK_SAFE` |
| **Lore** | Gerente fugiu; cofre analógico com chaves de contas secundárias. |
| **Gameplay** | Escritório → combinação (pistas do cenário) → `pendrive_chaves` → Quadro. |
| **Item** | `pendrive_chaves` |
| **POI / visual** | Sala revirada + cofre de parede |
| **NPC?** | Não · **mini-UX** combinação |
| **Status** | Pendente |

#### Q15 — O Servidor Central da Fachada
| Campo | Valor |
|-------|--------|
| **Step** | `RESTORE_POWER` |
| **Lore** | Relay central do distrito nos fundos de galeria fechada; Static quer o núcleo. |
| **Gameplay** | Painel de fusíveis → fecha circuito → `nucleo_processamento` → Quadro. |
| **Item** | `nucleo_processamento` |
| **POI / visual** | Corredor de galeria, transformadores |
| **NPC?** | Não · mini-UX fusíveis |
| **Status** | Pendente |

---

## 5. Inventário de assets a criar (visão agregada)

### Itens de missão (propostos)

`chave_mestre` · `mapa_patrulha` · `baterias_alta_densidade` · `recibo_extorsao` · `modulo_memoria` · `manifesto_cargas` · `relogio_ouro` · `amostra_biologica` · `documentos_sigilosos` · `unidade_transmissora` · `registros_rota` · `pendrive_chaves` · `nucleo_processamento` · (+ item/código da Q1)

Regra: quest item **não vende** / some no COMPLETE (ou se consome no turn-in). Grant só no handler do step.

### NPCs / contacts novos (mínimo)

| Quest | Entidade |
|-------|----------|
| Q2 | Contrabandista / contact de rescue |
| Q9 | Receptador do relógio |
| Q1 | (opcional) Operário — senão só terminal |

Mercenário existente = Quadro.

### POIs / markers (todas as quests)

Cada quest ≥ 1 marker Construct (Q4 = 3). Coordenadas reais na implementação da quest (city_01 / farm conforme mapa disponível).

---

## 6. Ordem de execução no chat

```text
1) Fase 0 — Fundação (schema + intent interact + tracker)
2) Q1 SCAN_TERMINAL
3) Q2 RESCUE_CONTACT (+ NPC)
4) Q3 RETRIEVE_DRONE
5) Q4 INJECT_VIRUS (3 POIs)
6) Q5 STEAL_BATTERIES
7) Q6…Q10 (Faixa 2)
8) Q11…Q15 (Faixa 3)
```

Pedido típico:

```text
módulo mercenário — implementar Fase 0 (fundação)
@docs/context/mercenary-quests-cronograma.md
@docs/context/progressao-pets-quests.md
```

Depois:

```text
módulo mercenário — implementar Q1 Sinal Fantasma
@docs/context/mercenary-quests-cronograma.md
```

Ao fechar cada quest: marcar **Status → Feito** neste arquivo (e data curta).

---

## 7. Fora de escopo (por enquanto)

- Reputation / `rewardBonds` / branches morais pesadas
- Liberar rotas permanentes no mapa só com `chave_mestre` (pode ser flavor até existir sistema de unlock)
- Tiers 4–5 / níveis > 30
- Combate obrigatório dentro da quest (salvo se uma quest futura pedir)

---

## 8. Arquivos âncora (código atual)

| Área | Path |
|------|------|
| Tipos | `src/shared/quests/mercenaryQuestTypes.ts` |
| Catálogo | `src/shared/quests/mercenaryQuestCatalog.ts` |
| Progresso | `src/shared/quests/mercenaryQuestProgress.ts` |
| Handlers | `src/server/handlers/world/MercenaryQuestHandlers.ts` |
| Store server | `src/server/quests/mercenaryQuestStore.ts` |
| Store client | `src/client/ui/quests/mercenaryQuestStore.ts` |
| Board UI | `src/client/app/components/world/panels/MercenaryQuestBoard.tsx` |
| Hook | `src/client/app/panels/useMercenaryQuestBoard.ts` |
| NPC Quadro | `npcRegistry` → `mercenario` |

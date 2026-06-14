# MUNDO ALTERNADO — Módulo Oficial — Atividades da Cidade

**Versão 1.0 | Maio 2026 | Solo Dev Project — Eliel**

> Atividades leves dentro da cidade — engajamento fora do loop principal de batalha e farm. Foco em interação social e economia interna simples.

---

## 01 — Visão Geral

| Dimensão | Decisão |
|----------|---------|
| Escopo MVP | Duelo de Apostas + Torneio Semanal |
| Moeda | DOLLAR VOLT (transações via `economyGateway`) |
| PH | Sem perda de PH em duelos/torneios |
| Ranking | Sem impacto no ranking |
| Pós-MVP | Quadro de Missões PvE, Loja de Cosméticos entre Jogadores |

---

## 02 — Duelo de Apostas

**Local:** ponto fixo na cidade (POI único).

| Regra | Detalhe |
|-------|---------|
| Formato | Duelo rápido 1v1 |
| Aposta | Ambos apostam DOLLAR VOLT antes do combate |
| Prêmio | Vencedor leva 100% do pote |
| PH | Sem perda |
| Ranking | Sem impacto |

**Fluxo (autoritativo):**
1. Jogador A desafia Jogador B no POI.
2. Ambos confirmam aposta (valor acordado ou tabela fixa — calibrar).
3. Servidor bloqueia VOLTS via transação ACID.
4. Combate usa motor existente (mesma tela de batalha v1.0).
5. Vencedor recebe pote; perdedor não perde PH.

---

## 03 — Torneio Semanal

**Local:** mesmo POI do duelo (hub de atividades).

| Regra | Detalhe |
|-------|---------|
| Frequência | 1× por semana |
| Capacidade | Máximo **32** jogadores |
| Entrada | Taxa em DOLLAR VOLT |
| Formato | Eliminatório — 1 derrota = eliminado |
| Prêmio | Top **3** dividem o pote |
| PH | Sem perda |
| Ranking | Sem impacto |

**Placar fixo na cidade:**
- Exibe nome + posição do **top 3** do último torneio.
- Visível para todos os jogadores na cidade (snapshot público).

---

## 04 — Stand-by (Pós MVP)

| Feature | Status |
|---------|--------|
| **Quadro de Missões PvE** | Painel com missões públicas de farm; recompensa em dinheiro + PH bônus. Principal motivação para nível baixo. A finalizar. |
| **Loja de Cosméticos entre Jogadores** | Marketplace P2P direto. Complexidade alta — pós-lançamento. |
| **Telão / espectador da arena** | Painel read-only da batalha ativa no palco (anel espectador); subscribe WS; **fora do MVP**. Apostas de terceiros depois do telão. Ver nota em `MODULO-MINIGAMES-CIDADE-v1.0.md` §04. |

---

## 05 — Integração Técnica (contratos)

| Área | Path |
|------|------|
| Tipos e regras | `src/shared/cityActivities/cityActivitiesConfig.ts` |
| Eventos (EventBus) | `src/shared/cityActivities/events.ts` |
| Economia | Toda aposta/prêmio via `economyGateway` — nunca direto no Combat |
| Combate | Combat emite fim de batalha; City Activities escuta e liquida apostas |

---

## 06 — Pendentes de prototipagem

- Valor mínimo/máximo de aposta no duelo.
- Taxa de entrada e split exato do pote (top 3).
- Horário/cron do torneio semanal.
- POI no mapa Cidade 01 (coordenadas do hub).
- UI do placar fixo + fila de inscrição.

---

*Mundo Alternado | Documento Confidencial | Solo Dev Project | Maio 2026*

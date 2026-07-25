Você é um Engenheiro de Software Sênior do projeto "Altercadia V2". Siga estas diretrizes críticas:

1. AUTORIDADE: O servidor (src/server/) é a única fonte da verdade. O cliente é um espelho visual (CombatDispatchPayload).
2. INTENTS: Toda interação Cliente-Servidor deve usar 'Intent' (com intentId) e handlers herdados de BaseIntentHandler.
3. SEGURANÇA: Nunca comite .env. Valide compatibilidade com Dockerfile/vercel.json antes de qualquer alteração no servidor.
4. ESTABILIDADE: Respeite as constantes em 'src/config/designConstants.ts'. Não use números mágicos.
5. CONTEXTO: Se a tarefa envolver infra ou arquitetura complexa, consulte `@Guia-DevOps.md` ou `@Guia-Arquitetura.md` antes de gerar código.
6. DESIGN: Nunca altere VIEWPORT, TILE.SIZE ou MAP.MAX_TILES_* sem consultar o guia de design.---
description: A description of your rule
---

# Guia de Arquitetura e Design - Altercadia V2

## Regras de Ouro (Mecânica)
- Event-driven; gateway autoritativo; cliente não calcula dano nem valida turno.
- WorldMap e BattleScreen são componentes visuais independentes.
- O Model é único, persistente e agnóstico à View.
- Comunicação de estados via EventBus / WebSocket (proibido acoplar views).

## Recompensas PVE
- XP/Progressão: Automático na vitória.
- Loot (Cassino): Requer ação de Coletar; 'dismiss' em vazio.
- Módulo canônico: `src/shared/progression/battleProgressionGrant.ts`.

## Design (Fonte da Verdade: src/config/designConstants.ts)
- Resolução: 640x360.
- Tile: 32x32. Player: 35x54 (âncora base).
- Migração de legado: Ao tocar em arquivos antigos, refatore o escopo alterado para usar `DESIGN_CONFIG`. Não refatore o arquivo todo.

## Regra de Economia e Tempo
- Preços: Apenas cálculo no servidor. Proibido qualquer cálculo de trade no cliente.
- Tempo: Ciclo dia/noite derivado exclusivamente de `gameTime` enviado pelo servidor.

# Guia de DevOps e Deploy - Altercadia V2

## Fluxo de Deploy (Automático)
1. `npm run deploy:check` (valida build/typecheck).
2. `npm run deploy` (commit + push + sync).
3. Nunca commitar: `node_modules/`, `dist/`, `data/`, `.env`.

## Checklist de Alterações no Servidor (src/server/**)
- Validar no Dockerfile: entrada deve ser `dist/server/index.js`.
- JSON do motor deve existir em `dist/server/engine/`.
- `GET /health` deve responder `{ ok: true }`.
- Porta: nunca porta fixa, usar `process.env.PORT`.

## Gateway Online (Protocolo)
- Toda Intent deve ter `intentId` e handler em `src/server/handlers/` herdando `BaseIntentHandler`.
- UI: Botões devem usar `ActionGatewayButton` com `PendingIntentRegistry`.
- Proibido: lógica inline, mensagens ad-hoc, mutação de estado fora de transação atômica.

## Variáveis de Ambiente
- .env: Fonte local única (template: .env.example).
- Vercel/Railway: Chaves devem ser injetadas via painel, nunca versionadas no Git.

# Guia de DevOps e Deploy - Altercadia V2

## Fluxo de Deploy (Automático)
1. `npm run deploy:check` (valida build/typecheck).
2. `npm run deploy` (commit + push + sync).
3. Nunca commitar: `node_modules/`, `dist/`, `data/`, `.env`.

## Checklist de Alterações no Servidor (src/server/**)
- Validar no Dockerfile: entrada deve ser `dist/server/index.js`.
- JSON do motor deve existir em `dist/server/engine/`.
- `GET /health` deve responder `{ ok: true }`.
- Porta: nunca porta fixa, usar `process.env.PORT`.

## Gateway Online (Protocolo)
- Toda Intent deve ter `intentId` e handler em `src/server/handlers/` herdando `BaseIntentHandler`.
- UI: Botões devem usar `ActionGatewayButton` com `PendingIntentRegistry`.
- Proibido: lógica inline, mensagens ad-hoc, mutação de estado fora de transação atômica.

## Variáveis de Ambiente
- .env: Fonte local única (template: .env.example).
- Vercel/Railway: Chaves devem ser injetadas via painel, nunca versionadas no Git.
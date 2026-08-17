# Altercadia — entrada do agente

Projeto grande. **Não varrer o repo.** Use a ficha do módulo.

1. Leia `docs/LEIA-PRIMEIRO.md` (protocolo de tokens).
2. Abra **só** `docs/context/INDEX.md` e a ficha do módulo pedido.
3. Código canônico: `src/shared` (contrato) → `src/server` (autoridade) → `src/client` (espelho).
4. Mundo visual = Construct 3 (`public/construct-world/`), **não** Phaser/Tiled.
5. Intents: `ActionDispatcher` + handler em `src/server/handlers/`. Economia só via `src/Economy/economyGateway.ts`.
6. Workflow do chat: `docs/context/workflow-cursor.md`. Limpeza só em fatias: `docs/context/limpeza-segura.md` — Phaser já saiu; atlas/`src/game` ainda entram no build.

Regras Cursor por glob (`.cursor/rules/module-*.mdc`) entram sozinhas ao editar arquivos daquela área. Não cole o GDD inteiro.

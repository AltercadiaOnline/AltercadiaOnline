# Como trabalhar neste repo sem gastar tokens

Altercadia já passou do tamanho em que “lê o projeto todo” funciona. O contexto certo é **uma ficha + os arquivos da tarefa**.

## O que você (humano) faz no chat

1. Diga o **módulo** e o **sintoma** (ou a feature).
2. Anexe **uma** ficha: `@docs/context/<modulo>.md`
3. Se for bug de tela, acrescente screenshot ou a mensagem da UI.
4. **Não** cole GDD, lore, CLASS-MOVES, nem pasta `src/` inteira.
5. Ritual completo: `docs/context/workflow-cursor.md`. Pedido de faxina = `docs/context/limpeza-segura.md` (uma fatia).

Exemplos:

```text
módulo spray — botão direito no pixo não abre HUD
@docs/context/spray-social.md

módulo combate — XP aplica, loot some ao sair
@docs/context/combate-pve.md

módulo combate — fila do púlpito não inicia o match
@docs/context/combate-pvp.md
```

## O que o agente deve fazer

| Fazer | Não fazer |
|-------|-----------|
| Abrir a ficha + 3–8 arquivos listados nela | Grep/Task “explore codebase” sem alvo |
| Diff mínimo no módulo | Refatorar Phaser/legado “de passagem” |
| `npm run deploy:check` se tocou server/shared | `npm run deploy` sem pedido explícito |
| Local = mesma intent que online | Mutar Zustand/inventário no cliente |

## Onde mora cada tipo de verdade

| Verdade | Onde |
|---------|------|
| Contrato (tipos, fórmulas compartilhadas) | `src/shared/` |
| Autoridade (dano, XP, itens, spray, mundo) | `src/server/` + `src/Economy/` |
| Espelho / HUD / Construct overlay | `src/client/` |
| Mapa visual | `public/construct-world/` + `npm run sync:construct` |
| Design 640×360 / tile 32 | `src/config/designConstants.ts` |
| Persistência personagem | `src/server/persistence/` (`PERSISTENCE_MODE=file`) |

## Docs deste folder

| Arquivo | Uso |
|---------|-----|
| `docs/context/INDEX.md` | Mapa de fichas — comece aqui |
| `docs/context/*.md` | Contexto operacional (código atual) |
| `docs/GDD-MECANICAS-V2.md` | Design de produto — só se a tarefa for GDD |
| `docs/lore.resumo.md` | Lore — só narrativa |
| `docs/CLASS-MOVES-KITS-v1.md` | Kits de classe — só moveset/catálogo |
| Restante em `docs/` | Histórico / QA; minigame cidade → `docs/historico/README.md`. Phaser nos textos velhos = sucata |

## Regras Cursor (automático)

Já existem sempre-ativas: identidade, Construct, colisão STOP, local=online, online-first.

Novas **por glob** em `.cursor/rules/module-*.mdc`: spray, combate, economia, persistência, UI. Elas **só entram** quando arquivos daquela pasta estão no contexto — isso economiza mais do que um PDF gigante.

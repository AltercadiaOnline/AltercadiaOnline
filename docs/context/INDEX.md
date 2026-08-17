# Fichas de contexto — índice

Cole **uma** ficha no chat. O agente não precisa procurar a árvore.

Prioridade = **sequência de jogo** (o que o jogador faz, na ordem), não tamanho de pasta.

```text
login → identidade → mundo + HUD → loja / spray → combate → progressão
         ↘ chat, ranking, minigames    ↘ áudio (fundo)
```

## Alta — quebra a sessão se falhar

Loop que o jogador percorre **toda vez**. Intent e save atravessam tudo. Combate: **uma** das três fichas (motor / PVE / PVP), não as três juntas.

| Ordem | Você está mexendo em… | Ficha | Pasta âncora |
|------:|-----------------------|-------|----------------|
| 1 | Login, Supabase, char select | [login.md](login.md) | `src/client/app/components/screen/` `src/shared/auth/` |
| 2 | Classe, slot, nome, skin | [identidade.md](identidade.md) | `src/shared/character/` |
| 3 | Mapa, movimento, NPC, overlay | [mundo.md](mundo.md) | `src/server/world/` + Construct |
| 4 | React HUD, painéis, teclado | [ui-cliente.md](ui-cliente.md) | `src/client/app/` |
| 5 | Motor, payload, Battle HUD, nomenclatura de move | [combate.md](combate.md) | `src/server/combat/` `src/server/engine/` |
| 5a | Vitória vs criatura: XP, marcos, loot cassino | [combate-pve.md](combate-pve.md) | `CombatSession.ts` + pending loot |
| 5b | Púlpito, fila 1x1, match ranqueado, rating | [combate-pvp.md](combate-pvp.md) | `src/server/combat/pvp/` |
| 6 | Itens, loja, banco, market, craft | [economia.md](economia.md) | `src/Economy/` |
| 7 | Spray / pixo / legado / amigo | [spray-social.md](spray-social.md) | `src/shared/social/` |
| — | Intent, handler, pending UI | [intents-gateway.md](intents-gateway.md) | `src/server/handlers/` |
| — | Save, snapshot, file vs postgres | [persistencia.md](persistencia.md) | `src/server/persistence/` |

## Média — depois que o loop core anda

Progressão e social de mapa. Só abrir estas fichas se o bug for **desse** POI.

| Ordem | Você está mexendo em… | Ficha | Pasta âncora |
|------:|-----------------------|-------|----------------|
| 8 | Marcos, pets, missões mercenário | [progressao-pets-quests.md](progressao-pets-quests.md) | `src/server/progression/` `pets/` `quests/` |
| 9 | Chat global | [chat.md](chat.md) | `src/server/handlers/social/ChatGlobalSendHandler.ts` |
| 10 | Ranking / placar da arena | [ranking.md](ranking.md) | `src/server/leaderboard/` |
| 11 | Refração, terminal zona 1, lazer cidade | [minigames-cidade.md](minigames-cidade.md) | `src/shared/cityMinigames/` `worldTerminalCatalog.ts` |

## Baixa — polish e meta do chat

Não misturar com feature de combate/loja. Limpeza = fatia explícita.

| Você está mexendo em… | Ficha | Pasta âncora |
|-----------------------|-------|----------------|
| BGM / catálogo de áudio | [audio.md](audio.md) | `src/client/audio/` |
| Onde fica o quê | [mapa-pastas.md](mapa-pastas.md) | `src/` |
| Como falar com o agente | [como-conversar-com-o-agente.md](como-conversar-com-o-agente.md) | — |
| Ritual Cursor (tokens) | [workflow-cursor.md](workflow-cursor.md) | chat + Agent/Ask |
| Limpeza em fatias | [limpeza-segura.md](limpeza-segura.md) | **não** faxina total |

## Camada global (não repetir em toda ficha)

- Cliente **não calcula** dano, XP, preço, loot, spray.
- `ActionDispatcher.dispatch` nos dois modos (`src/client/runtime/gameMode.ts`). `npm run dev` = **online** (multiplayer). Mock = `npm run dev:mock`.
- Design: viewport **640×360**, tile **32**, player **35×54** — `DESIGN_CONFIG`.
- Produção: Vercel (front) + Railway (WS). Bug de sync = os dois hosts.
- `.env` nunca vai pro Git.

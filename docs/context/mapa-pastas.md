# Mapa de pastas (código atual)

```text
src/
  shared/          contratos (cliente E servidor importam)
  server/          autoridade WS/HTTP, handlers, combate, mundo
  client/          espelho: React HUD, Construct overlay, intents
  Economy/         gateway + stores de itens/moedas (servidor)
  config/          DESIGN_CONFIG, manifests de asset processado

public/
  construct-world/ export Construct (cena do mapa)
  assets/          PNG itens, NPCs, sprays, UI, áudio
  index.html       shell do browser

construct/         projeto Construct fonte + bridge JS
docs/context/      fichas operacionais (este pack)
```

## `src/shared/` (o que existe de fato)

character, combat, economy, items, world, pet, persistence, intent, sync, social, quests, loot, progression, bank, crafting, chat, cityActivities, leaderboard, auth, npc, …

## `src/server/`

| Pasta | Papel |
|-------|--------|
| `handlers/` | IntentHandlers (`economy/`, `social/`, `world/`, `pets/`, `combat/`, `city/`, `crafting/`, `progression/`, `dev/`) |
| `combat/` | CombatGateway; PVE = CombatSession; PVP = `pvp/` — fichas [combate.md](combate.md) / [combate-pve.md](combate-pve.md) / [combate-pvp.md](combate-pvp.md) |
| `world/` | GameLoop, movimento, sprays dirty |
| `persistence/` | load/save personagem + world-sprays.json |
| `net/` | WS hub, staticServer, rotas |
| `network/` | ActionDispatcher server, BaseIntentHandler |
| `progression/` | XP/nível/marcos autoritativos |
| `engine/` | CombatEngine + JSON de balance |
| `social/` | friendListStore (memória, unilateral) |
| `quests/` | mercenaryQuestStore |

Registro de handlers: `src/server/handlers/bootstrapHandlers.ts`  
Entrada: `src/server/index.ts` → `dist/server/index.js`

## `src/client/` (não é Phaser)

| Pasta | Papel |
|-------|--------|
| `app/` | React: App, WorldPanels, BattleHUD, AuthScreen |
| `worldRender/construct/` | overlay entidades + runtime Construct |
| `world/` | spray mirror, minimapa, sync de criaturas |
| `combat/` | playback do payload do servidor |
| `ui/` | stores, context menu, teclado |
| `testing/MockEconomyService.ts` | autoridade local (mesmo intent) |
| `ActionDispatcher.ts` | único dispatch da UI |

## Legado mental — não seguir

- Phaser, Tiled `.tmj`, `TILE_SIZE = 64` como autoridade
- `docs/FRONTEND-FOUNDATION.md` antigo falava de stubs de painel e Phaser — a ficha [ui-cliente.md](ui-cliente.md) é a atual
- `docs/ASSET_MANAGEMENT.md` descrevia pipeline Phaser; ver [mundo.md](mundo.md) + `docs/ASSET_MANAGEMENT.md` (banner atualizado)

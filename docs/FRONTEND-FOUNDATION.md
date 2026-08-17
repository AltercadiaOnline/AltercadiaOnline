# Frontend — cliente atual (React + Construct)

Substitui o texto antigo (Phaser / painéis stub). Detalhe operacional: `docs/context/ui-cliente.md`.

## Princípio

```text
Construct + overlay canvas  →  #game-render-host     visual 640×360
HUD in-game (React)         →  #game-react-hud-root  world + battle
Screen (React)              →  #screen-react-root    login / char select
```

Cliente **espelha**. Dano, XP, preço, spray e movimento final = servidor (ou Mock no modo local).

## Bootstrap

1. `src/client/browser/main.ts` — HUD runtime + mundo
2. `initReactGameHud` / `ensureGameHudRuntime` — um reconciler React
3. `App.tsx` — world vs battle via `GameStateManager`

API: `src/client/app/index.ts`. Arquitetura `online-react-v1`.

## Z-index (`uiLayers.ts`)

| Camada | z |
|--------|---|
| Render | 0 |
| World scene shell | 920 |
| Battle HUD | 921 |
| Sidebar persistente | 930 |
| Painéis mundo | 940 |
| Overlay (loot / spray inspect) | 10000 |

## Pastas React

```text
src/client/app/
  components/
    screen/     Auth, CharSelect, CyberVoidBackground
    world/      WorldSceneShell, WorldPanelsLayer, hud/, panels/
    battle/     BattleHUD, loot casino, nameplates
    App.tsx     router in-game
  panels/       worldPanelRegistry + hooks de cada janela
  shell/        uiLayers, clientArchitecture
  bridge/       legado ↔ React
```

Mundo visual: `src/client/worldRender/construct/` — **não** `src/client/phaser`.

## Painéis

Todos os IDs em `REACT_WORLD_PANEL_IDS` têm implementação (inventory, bank, market, marcos, quest, social, pets, PVP, etc.). Não tratar como stub.

## Estado

SSOT servidor / Mock. React usa stores (`PlayerDataStore`, equipment, items, Zustand bridges). `ActionDispatcher` para qualquer mutação.

## Build

```bash
npm run dev            # build + servidor local
npm run deploy:check   # typecheck + build (+ audit Construct)
```

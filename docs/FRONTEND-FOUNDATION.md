# Frontend Foundation — Cliente Online React/Híbrido

Arquitetura oficial do front Altercadia para **online-first**: render no DOM, UI em React, estado autoritativo no legado/servidor.

## Princípio

```text
Render (canvas/Phaser)  →  #game-render-host   — gameplay visual, 640×360
HUD in-game (React)     →  #game-react-hud-root — world + battle
Overlay (React)         →  #game-react-overlay-root — loading, pós-batalha, loot
Screen (React)          →  #screen-react-root  — login, char select (flags off = legado HTML)
```

**Regra de ouro:** React espelha stores/bridges — nunca calcula dano, XP, economia ou movimento.

## Bootstrap (ordem)

1. `main.ts` → `initReactHudHost()` — reserva roots, `gameUiBridge.setMode('react-hybrid')`
2. `ui-runtime.js` → `mountReactUiRuntime()`:
   - `initClientApp()` — bridges + Zustand sync
   - `mountScreenRuntime` / `mountHudRuntime` / `mountOverlayRuntime`
3. `enterWorld()` → `initReactGameHud()` — `data-react-game-hud-ui=1`
4. `initBattleHud()` → `initReactBattleHud()` — `data-react-battle-hud-ui=1`

API pública: `src/client/app/index.ts`

## Camadas e z-index

| Camada | z-index | Superfície |
|--------|---------|------------|
| Render | 0 | `#game-render-host` |
| World shell | 920 | vitals, hub |
| Battle HUD | 921 | combate |
| World panels | 925 | painéis móveis |
| Screen | 960+ | auth (quando ativo) |
| Overlay | 10000 | loading, loot casino |

Constantes: `shell/uiLayers.ts` → `UI_LAYER_Z_INDEX`

## Estrutura de pastas

```text
src/client/app/
  bootstrap/          initClientApp, teardown
  bridge/               legado ↔ React (singletons)
  components/
    screen/             ScreenApp, Auth/CharSelect shells
    world/              WorldSceneShell, WorldPanelsLayer, panels/*
    battle/             BattleHUD, loot, pós-batalha
    GameShell.tsx       envelope HUD in-game
    App.tsx             router world | battle
    OverlayMount.tsx
  hooks/                useAppScreen
  hud/                  initReact* flags
  panels/               worldPanelRenderers, initWorldPanelsBridge, hooks
  phaser/               initPhaserReadyLayer (stub pronto)
  runtime/              mount*Runtime + uiRuntime entry
  shell/                clientArchitecture, uiLayers, screenSurface
  store/                Zustand (espelho) + worldPanelsStore
  types/                uiSurfaces
  index.ts              API pública
```

## Estado

| Camada | SSOT | Espelho React |
|--------|------|----------------|
| Jogo | `GameStore`, `GameStateManager` | `useGameStore` (Zustand) |
| Painéis | `worldPanelsStore` + `PanelsBridge` | `useWorldPanelsStore` |
| Battle UI | `battleHudBridge` | componentes battle |
| Tela ativa | `appScreenBridge` | `useAppScreen` |

## Painéis World

- **Implementados:** hub, inventory, craft, dialogue, vendorShop, laboratoryShop, petTrainerShop, tournamentBet, rankingMonitor, refractionBooth
- **Stub (WorldPanelShell):** characters, moveset, marcos, quest, social, shop, market, bank, petLove, diary, …
- Registry: `panels/worldPanelRegistry.ts` + mapa `panels/worldPanelRenderers.tsx`

## Feature flags (`document.body.dataset`)

| Flag | Efeito |
|------|--------|
| `reactGameHudUi=1` | World React + oculta legado `#ui-layer` |
| `reactBattleHudUi=1` | Battle React |
| `reactAuthUi=1` | Screen login React (placeholder) |
| `reactCharSelectUi=1` | Screen char select React |
| `phaserReady=1` | Phaser wired; default `canvas-legacy` |

Ativar Phaser dev: `enablePhaserHybridMode()` de `app/index.ts`

## Próximos passos seguros

1. Migrar auth/char select para `ScreenApp` (ativar flags + ocultar HTML legado)
2. Widgets world: chat, minimapa, wallet sidebar → `WorldHUD`
3. Painéis stub restantes (moveset, marcos, market, …)
4. Phaser: conectar `ExplorationPhaserScene` ao loop de exploração
5. Remover dual-render legado quando cada superfície tiver paridade React

## Build

```bash
npm run build:ui    # Tailwind + esbuild → public/app-ui/
npm run dev         # legado + ui-runtime
npm run deploy:check
```

Versão de arquitetura: `online-react-v1` (`body[data-ui-architecture]`)

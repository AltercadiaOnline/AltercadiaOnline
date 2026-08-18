# UI cliente (React + Construct)

Arquitetura: `online-react-v1`. Um React. Construct no DOM. HUD acima.

## Roots

| Root | ID | Uso |
|------|----|-----|
| Render | `#game-render-host` | Construct + overlay canvas |
| HUD | `#game-react-hud-root` | world + battle |
| Screen | `#screen-react-root` | login / char select |
| Overlay extra | `#screen-overlay-root` | overlays pontuais |

## Z-index (`src/client/app/shell/uiLayers.ts`)

render 0 · worldSceneShell 920 · battleHud 921 · sidebar 930 · worldPanels 940 · overlay 10000

## Router in-game

`src/client/app/components/App.tsx`: WorldSceneShell + WorldPanelsLayer + SprayInspectHud + PlayerInspectHud + CasualDuelInviteHud + PlayerTradeHud | BattleHUD. Sidebar sempre montada.

## Painéis mundo (todos no registry)

hub, inventory, characters, moveset, marcos, quest, social, shop, market, marketHub, craft, bank, dialogue, vendorShop, laboratoryShop, petTrainerShop, tournamentBet, rankingMonitor, pvpQueue, refractionBooth, petLove, petMemorial, diary.

Registry: `src/client/app/panels/worldPanelRegistry.ts`

## Auth

Login / char select: ficha [login.md](login.md). Esta ficha é HUD **in-game** (mundo + batalha).

## Estado UI

Stores/bridges espelham servidor. Painel não calcula preço nem HP final de combate.

## Teclado

`src/client/ui/KeyboardManager.ts` — G = `dispatchPlaceSpray`. Escape fecha HUD de spray, a ficha pinada do player e a mesa de trade (cancela no servidor); desafio de duelo tem Aceitar/Recusar (alvo) e Cancelar (quem desafiou).

## PC fraco

ESC → Pausa também troca **Desempenho Leve/Normal** (mesmo preset do login). Leve: ~30 fps, sem blur/sombra, relógio sem rAF, overlay de dia/noite desligado.

## Docs velhos

`docs/FRONTEND-FOUNDATION.md` foi alinhado a este mapa. Ignorar qualquer menção a Phaser híbrido / painel stub.

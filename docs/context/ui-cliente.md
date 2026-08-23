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

hub, inventory, characters, moveset, marcos, quest, social, shop, market, marketHub, craft, bank, dialogue, vendorShop, laboratoryShop, petTrainerShop, tournamentBet, rankingMonitor, pvpQueue, refractionBooth, petLove, petMemorial, diary, staticNet.

Registry: `src/client/app/panels/worldPanelRegistry.ts`

## Auth

Login / char select: ficha [login.md](login.md). Esta ficha é HUD **in-game** (mundo + batalha).

## Estado UI

Stores/bridges espelham servidor. Painel não calcula preço nem HP final de combate.

## Teclado

`src/client/ui/KeyboardManager.ts` — G = `dispatchPlaceSpray`. Escape fecha HUD de spray, a ficha pinada do player e a mesa de trade (cancela no servidor); desafio de duelo tem Aceitar/Recusar (alvo) e Cancelar (quem desafiou).

Chat/log (`WorldCommsStack`): 248px à esquerda. **Um direito** no peer = `PlayerInspectHud` (mesmo input do andar, botão 2). Duplo esquerdo = card legado. `#game-react-hud-root` é `pointer-events: none`.

## PC fraco

ESC → Pausa também troca **Desempenho Leve/Normal** (mesmo preset do login). Leve: ~30 fps, sem blur/sombra, relógio sem rAF, overlay de dia/noite desligado.

## Inventário (skin)

Painel `WorldInventoryPanel`: skin **metal + holo** em `public/styles.css` (`.ui-panel--inventory`). Sem override de vidro/frosted.

## Hub Social (skin)

`WorldHubPanel`: mesma skin in-game que o inventário (`ui-skin-hybrid` metal+holo suave). **Sem** `ui-skin-hybrid--holo-boost` — holo reforçado só fora do mundo (login / char-select).

## HUDs de NPC (skin)

Todas usam `ui-skin-hybrid` + chrome interno metal/holo:

- Card de interação (`InteractionCard`)
- Diálogo genérico / Cael (`WorldDialoguePanel`)
- Lojas NPC: vendor, lab, pet trainer, shop, bank, craft, market, market hub
- Terminais: arena ranking, púlpito PvP, refração, tournament bet, pet memorial / pet love

Classe marcadora: `ui-panel--npc-hybrid` / `ui-panel--dialogue-hybrid`. Tokens: `--ui-metal-*`, `--ui-holo`.

## Overlays sociais (skin)

Ficha de player, convite de duelo, trade, spray e aceite PVE usam `hud-overlay-card` + `ui-skin-hybrid` (chassis metal+holo, tokens `--ui-*`). DOM no bundle do jogo: `playerInspectDomHud.ts`, `casualDuelDomHud.ts`, `playerTradeDomHud.ts`. PVE: `WorldPveEncounterHud`. Sem paleta menta/ouro/céu. Botão primário = metal do confirm do inventário (não fill holo).

Moveset, Marcos e Social declaram `ui-skin-hybrid` no `panelClassName` (além do `MovablePanelFrame`).

## Contratos × Static

- `WorldQuestPanel` (Hub → Contratos): só o tracker do contrato ativo. Largura 360, altura auto, teto 380px.
- Rede Static / Vortex: janela `staticNet` (`WorldStaticNetworkPanel`, título **Agentes Vortex**). Chip **SINAL** no cluster (ao lado do relógio), não no Hub Social. Radar **global do shard**: agente em qualquer distrito deixa aquela zona QUENTE e acende o chip, independente de onde o jogador está.

## Docs velhos

`docs/FRONTEND-FOUNDATION.md` foi alinhado a este mapa. Ignorar qualquer menção a Phaser híbrido / painel stub.

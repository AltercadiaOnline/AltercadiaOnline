# Gestão de Assets — Altercadia (atual)

> **Phaser / Tiled / PreloaderScene foram removidos.** Pipeline antigo abaixo não é runtime.
> Mapa = Construct 3. Ver `docs/context/mundo.md` e `.cursor/rules/construct-world.mdc`.

## O que o jogo usa agora

| Tipo | Onde | Como |
|------|------|------|
| Mapa / props / colisão visual | `public/construct-world/` | Export Construct + `npm run sync:construct` |
| Player / NPC / criatura | overlay `ConstructEntityOverlay.ts` | PNG + bundles `npcAssetBundles.ts` |
| Ícones de item | `public/assets/items/{catalogId}.png` | `npm run sync:item-icons` / `audit:item-icons` |
| Sprays no chão | `OFFICIAL_SPRAY_STENCILS.renderAssetUrl` | overlay; HUD da lata em `itemIconDisplay.ts` |
| Design sizes | `src/config/designConstants.ts` | 640×360, tile 32, player 35×54 |

## Construct (obrigatório)

- Layouts: `cidade_01`, `zonabeco1`
- Bridge: `altercadia-bridge-dom.js` / worker
- WebGL only (não WebGPU no export)
- Placements gerados: `npm run generate:construct-placements`

## Convenção de item

`public/assets/items/{itemId}.png`. Subpastas sincronizam com o script de ícones.

## Manifest processado (legado residual)

`src/config/processedAssetManifest.ts` e `npm run generate-assets` ainda existem no repo. **Não** religar Phaser para consumi-los. Se um PNG de criatura/NPC falhar, o overlay usa fallback — não `scene.textures` do Phaser.

---

## Arquivo histórico (não executar)

O fluxo “Login → PhaserRuntime → PreloaderScene → MapInstanceScene” **não existe mais**. Qualquer snippet com `load.atlas`, `TiledAssetManager` ou `enablePhaserHybridMode` é sucata.

# Gestão de Assets — Altercadia Online

Este documento descreve como o cliente Phaser carrega e consome assets visuais no boot do jogo e na exploração de mapas.

## Fluxo de boot (ordem)

```text
Login / Char Select (domínio login)
  → Entrar no Mundo (activateGameDomain)
  → PhaserRuntime boot
  → PreloaderScene          ← atlases críticos (bloqueiam preloaderGate)
  → CreatureAssetLoader     ← validação de manifests (HEAD fetch)
  → MapInstanceLoading      ← tilesets/props do mapa alvo
  → MapInstanceScene        ← MapLoader monta o mundo
```

O `ServiceRegistry` só permite carregar módulos do jogo (`CreatureAssetLoader`, `MapLoader`, `PhaserRuntime`, etc.) após `activateGameDomain()`. Chamadas no domínio login lançam `Error` imediatamente.

## Dois pipelines de textura

### 1. `load.image` — grid legado / terrain

| Exemplo | Chave Phaser | Onde carrega |
|---------|--------------|--------------|
| `terrain_atlas.png` | por tileset (`tiledTilesetTextureKey`) | `TiledAssetManager` na `MapInstanceLoading` |
| PNGs soltos em `/assets/terrain/`, `/assets/props/` | por mapa + nome | `MapInstanceLoading` |

**Características:**

- Folha única ou PNG por tileset.
- Phaser fatia frames via `addTilesetImage` + `margin/spacing/columns`.
- Adequado para tile layers 32×32 e props sem pipeline de atlas processado.
- Placeholder procedural se o PNG falhar (404).

### 2. `load.atlas` — processado (`npm run generate-assets`)

| Asset | Chave Phaser | Onde carrega |
|-------|--------------|--------------|
| Road2 | `road2_atlas` | **PreloaderScene** (crítico) |
| Road1, Road3, Road4 | `processed:tileset:{basename}` | `MapInstanceLoading` / `TiledAssetManager` |
| Criaturas zone1 top-down | `zone1-topdown-creatures` | **PreloaderScene** (crítico) |

**Características:**

- PNG + JSON gerados por `scripts/generateAtlas.ts` → `src/config/processedAssetManifest.ts`.
- Frames nomeados no JSONArray; sem margin manual no runtime.
- Road2 e criaturas zone1 são **assets críticos**: `preloaderGate` só libera após estarem em `scene.textures`.

Manifesto canônico: `src/config/processedAssetManifest.ts`  
Regenerar após alterar PNGs fonte: `npm run generate-assets`

## PreloaderScene — assets críticos

Definidos em `src/client/phaser/preloader/preloaderCriticalAssets.ts`:

- `road2_atlas`
- `zone1-topdown-creatures`

`markPreloaderReady(textures)` chama `assertCriticalPreloaderTextures()` — sem esses atlases no cache, o jogo não avança para `MapInstanceLoading`.

`MapLoader.isPreloaderReady()` e `MapInstanceSceneManager` respeitam esse gate.

## CreatureAssetLoader — papel após a migração

| Momento | O que faz |
|---------|-----------|
| **PreloaderScene** (única chamada de boot) | `startLoadingZone(ZONE1_ID)` — valida URLs dos manifests (HEAD fetch) para side-view e fallbacks PNG |
| **Runtime exploração** | **Não** recarrega atlas; `phaserWorldActorsController` lê frames de `zone1-topdown-creatures` no cache Phaser |
| **Combate / UI** | `getCreatureAssets()` resolve URLs side-view para `BattleSprite` (DOM/canvas, fora do atlas top-down) |

Não chamar `startLoadingZone` em `MapInstanceLoading` nem em cenas de mapa — o atlas já está no cache global do Phaser.

## MapInstanceLoading — escopo por mapa

`mapInstanceAssetManifest.queueMapInstanceAssets()` enfileira:

- Tilesets Tiled (`load.image` via `TiledAssetManager`)
- Props/structures referenciados no descriptor do mapa
- Atlases processados adicionais (Road1/3/4) quando o mapa os referencia

**Não** enfileira:

- `zone1-topdown-creatures` (Preloader)
- `road2_atlas` (Preloader)
- JSON do tilemap (injetado em memória pelo manifest, não `scene.load`)

## Placeholders e falhas parciais

- Assets de mapa (tileset/prop ausente): placeholder procedural; exploração continua.
- Assets críticos do Preloader: falha bloqueante com `Error` — corrigir manifest ou rodar `generate-assets`.
- JSON do mapa ausente na `MapInstanceLoading`: transição abortada (crítico para mapas Tiled).

## Arquivos de referência

| Área | Path |
|------|------|
| Preloader | `src/client/phaser/scenes/createPreloaderPhaserScene.ts` |
| Gate | `src/client/phaser/preloader/preloaderGate.ts` |
| Críticos | `src/client/phaser/preloader/preloaderCriticalAssets.ts` |
| Mapa instância | `src/client/phaser/scenes/mapInstanceAssetManifest.ts` |
| Tilesets processados | `src/client/phaser/tiled/processedTilesetPreload.ts` |
| Criaturas runtime | `src/client/phaser/player/phaserWorldActorsController.ts` |
| Manifests | `src/config/processedAssetManifest.ts`, `src/config/zone1ProcessedCreatureAtlas.ts` |
| ServiceRegistry | `src/client/domains/ServiceRegistry.ts` |

## Comandos úteis

```bash
npm run generate-assets   # regenera atlases processados + processedAssetManifest.ts
npm run mirror:map-mund     # espelha .tmj → config/maps/*PhaserMap.json
npm run deploy:check        # typecheck + build antes de publicar
```

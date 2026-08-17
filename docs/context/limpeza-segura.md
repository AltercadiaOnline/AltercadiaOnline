# Limpeza segura (não é faxina total)

O motor Phaser **já saiu**. O que parece “morto” ainda pode estar no **build** (`deploy:check` / `audit-static-bundle`). Apagar no escuro quebra Vercel.

## Lei

1. Grep de import (código + `package.json` + `audit-static-bundle.mjs`) **antes** de deletar.
2. Uma fatia por PR/chat.
3. `npx tsc --noEmit` + teste do módulo. Se tocou build/scripts: `npm run deploy:check`.
4. Não misturar com feature de spray/combate/economia.

## Ainda vivo (NÃO apagar agora)

| Coisa | Por quê |
|-------|---------|
| `src/game/` (GameConfig, AssetRegistry, atlas loader) | Overlay/minimap/audit ainda exigem esses JS em `public/` |
| `npm run generate-assets` no `build:core` | Gera atlas de criaturas processadas; audit exige o PNG/JSON |
| `placeholderRenderer` | Minimap importa cores; `world/index` ainda exporta |
| `CreatureAssetLoader` | Overlay de criaturas / batalha |
| `AuthScreen.legacy.tsx` | Flag `AUTH_HUD_TEST_LAYOUT` ainda troca o login |
| Scripts `seed:*` / `build:tileset` | Pipeline de PNG; Construct não usa Tiled **em runtime**, mas assets públicos ainda existem |

## Quarentena (parece sucata, confirmar numa fatia)

| Alvo | Risco | Fatia |
|------|-------|-------|
| JSDoc “PreloaderScene” | Zero | A — **feita** |
| `seedDemo*` / `bootstrapMvpPlayerItems` | Baixo se ninguém chama | B — **feita** (2026-08-16) |
| Docs city/minigame se o estande já é refraction booth | Baixo | C — **feita** (2026-08-16, só markdown) |
| Tirar `generate-assets` do `prebuild:maps` | **Alto** | D — só depois de prova que overlay não precisa do atlas |
| `src/game/generated/testAssetsRegistry` / meu-pack | Médio | E — audit + overlay |
| Login legado (`AuthScreen.legacy`) | Médio (regressão visual) | F — quando o HUD novo estiver canônico |

## Fatias (ordem)

**A — comentários/docs (este nível é o único “sempre seguro”)**  
JSDoc Phaser, links mortos. Sem mudança de runtime.

**B — API demo morta (feita)**  
Removidos `seedDemo*` / `bootstrapMvpPlayerItems` / `DEMO_STARTER_INVENTORY_STACKS`. Personagem novo segue vazio. `ensureAuthoritativePlayerEconomyEmpty` / `bootstrapEmptyPlayerItems` continuam.

**C — docs de produto (feita)**  
Banners em `BRIEF-BACKEND-MINIGAME-ESTANDE-TIRO.md`, `MODULO-MINIGAMES-CIDADE-v1.0.md`, `MODULO-ATIVIDADES-CIDADE-v1.0.md`. Índice: `docs/historico/README.md`. GDD/lore/kits **não** apagados. **Zero runtime.**

**D — build maps (depois, com prova)**  
Medir: criaturas no overlay usam PNG soltos de `public/assets/creatures/` ou o atlas `zone1_top_down_creatures`? Só então remover `prebuild:maps`.

**E — registry Tiled/pack de teste**  
`generate:city01-wiring` / `meu-pack` só se Construct + overlay não lerem mais.

## Como pedir no chat

```text
Modo: limpeza-fatia
Fatia: D
Ficha: @docs/context/limpeza-segura.md
Só depois de prova de import do atlas. Não tocar Construct/combate/economia “de passagem”.
```

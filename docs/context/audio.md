# Áudio (BGM / SFX)

Cliente só toca. Sem autoridade de jogo.

## Arquivos âncora

| Peça | Path |
|------|------|
| Manager | `src/client/audio/AudioManager.ts` |
| Catálogo | `src/client/audio/audioCatalog.ts` |
| Assets | `public/assets/audio/bgm/` |
| Telas menu | `isMenuBgmScreen` → `login-screen`, `char-select-screen` |

## Contrato atual

- **Um** `HTMLAudioElement` de BGM. Não criar `new Audio()` por tela.
- Trilha no catálogo hoje: `login`. Mundo/combate ainda sem BGM dedicado neste pack.
- SFX de combate continua em elementos DOM até existir bus próprio.
- Autoplay: espera primeiro gesto; pausa com `visibilitychange`.

Nova zona/tela: acrescentar `BgmTrackId` no catálogo, não path solto na UI.

## Proibido

Avançar relógio do mundo com áudio. Calcular gameplay a partir de `ended`/`timeupdate`.

# Spray / pixo (social)

Legado = **1 mensagem por personagem** (perfil), não por tile. Todos os pixos do autor mostram a mensagem ao vivo no inspect.

## Ponte de HUD (produto)

| Ação | HUD |
|------|-----|
| Botão direito no pixo **do colega** no chão | Mini HUD só: nome, Lv, recado personalizado, Fechar, **Adicione como amigo**. Sem online, sem editor, sem duelo. |
| Botão direito no **player** (sprite na tela 640×360) | **Outra HUD** (`PlayerInspectHud`): SET, **Adicione como amigo**, convite de duelo, **Fazer trade**. Não fecha se o alvo andar. Pixo tem prioridade no mesmo pixel. |
| Botão direito na lata no inventário | Editor do próprio legado → `UPDATE_SPRAY_LEGACY` |
| Tecla G | só `PLACE_SPRAY` (não consome no cliente) |

Proximidade: overlap AABB > 30% com pixo de **outro** = rejeita `"Este pixo está muito próximo de outro pixo de jogador."` Próprio no mesmo tile = substitui stencil.

## Arquivos (abrir estes, não o repo)

| Peça | Path |
|------|------|
| Tipos + sanitize 120 chars | `src/shared/social/spraySocialTypes.ts` |
| Overlap 40px / pick 64px | `src/shared/social/sprayOverlap.ts` |
| Store autoridade | `src/shared/social/tacticalSprayStore.ts` (server + Mock **somente**) |
| Place / inspect / legado | `src/server/handlers/social/PlaceSprayHandler.ts` etc. |
| Persist mundo | `src/server/persistence/worldSprayPersistence.ts` → `data/{shard}/world-sprays.json` |
| Tick | `GameLoop` + `spraySyncDirty.ts` |
| Mirror render | `src/client/world/worldSpraySyncBridge.ts` |
| HUD store/actions | `sprayInspectStore.ts`, `spraySocialActions.ts` |
| UI | `src/client/app/components/world/hud/SprayInspectHud.tsx` (z overlay, `position: fixed`) |
| Overlay draw | `ConstructEntityOverlay.ts` lê **mirror**, não o service |
| Amigo | `AddFriendHandler.ts` + `friendListStore.ts` — unilateral (Tibia), sem aceite. Nomes no save do personagem. |

## Ainda não fechado (não fingir que está)

- Whisper: ao vivo no widget de chat (clique duplo no nome). Sem histórico. Offline = não envia.
- Painel Social ainda mostra upvotes/volts de protótipo (não é economia real).
- Gift P2P: mesma autoridade file do trade (`commitAuthoritativeGiftTransfer`). Destinatário no mundo. Não misturar com a mesa presencial.
- SQL `supabase/migrations/017_world_sprays_legacy.sql` é contrato; runtime = **file**.
- Pick no chão depende do overlay (`pointer-events: none`) + hitbox 64px — sprite muito maior pode “errar” o clique.
- Paths de PNG em `OFFICIAL_SPRAY_STENCILS` precisam existir em `public/assets/items/assets_sprays/`.

## Proibido

Consumir lata ou escrever spray no cliente. Overlay importar `tacticalSprayService`.

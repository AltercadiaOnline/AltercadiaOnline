# Login / auth / char select

Primeira tela da sessão. Sem login estável o resto do MMO não existe.

```text
AuthScreen → JWT / sessão local → CharSelect (hub) → identidade → enter-world
```

Alvo hop: slot da **conta** → escolhe **mundo** → WS daquele host. Hoje o hub ainda filtra por `SERVER_ID` do processo (fase 3). Save file já é `(userId, characterId)` em `data/account/`. Plano: [personagem-mundos.md](personagem-mundos.md).

## Arquivos âncora

| Peça | Path |
|------|------|
| Tela login | `src/client/app/components/screen/AuthScreen.tsx` |
| Fundo | `CyberVoidBackground.tsx` |
| Char select | `CharSelectScreen.tsx`, `CharacterCreateModal.tsx`, `CharacterDeleteModal.tsx` |
| Shell telas | `ScreenApp.tsx`, `src/client/browser/appScreens.ts` |
| Cliente Supabase | `src/client/auth/supabaseAuth.ts` |
| Contrato hub | `src/shared/auth/characterHubProtocol.ts` |
| Hub HTTP | `src/server/net/characterHubService.ts`, `characterHubRoute.ts` |
| Hidratação | `hydrateCharacterSession` em persistência → `full-state-sync` |

## Local vs produção

| | Produção | Localhost |
|--|----------|-----------|
| Auth | Supabase obrigatório | Email local opcional |
| Personagens | `GET /api/character-hub` + JWT | `localCharacterHubStore` |
| Cliente vê | `SUPABASE_URL` + `SUPABASE_ANON_KEY` via `/config/client` | igual se configurado |

Localhost (`npm run dev`) = **mesmo multiplayer da produção** (`GAME_MODE=online`, WS no Node local).  
Dois e-mails = **dois browsers** (Chrome normal + anônimo), ambos em `http://localhost:PORTA/` — sem query.

Mock 1 jogador: `npm run dev:mock` ou `/?gameMode=local` (só localhost). Produção nunca ativa Mock.

`AuthScreen.legacy.tsx` só com flag `AUTH_HUD_TEST_LAYOUT`. Não é o login canônico.

## Proibido

- `SUPABASE_SERVICE_ROLE_KEY` no browser
- Commitar `.env`
- Enter-world sem `CharacterIdentity` (não fallback `IMPETUS`)
- Tratar `localStorage` de sessão como bypass de Supabase em produção

## PC fraco

Botão **Desempenho: Leve / Normal** no login e no char select (`PerformancePresetToggle`).  
Persistência: `localStorage` `altercadia.performancePreset`. Query `?perf=lite`.  
Código: `src/client/runtime/performancePreset.ts`. Não muda 640×360 nem o servidor.

Leve também: sem fontes Google no boot, teto ~30 fps no mundo/arena, sem sombras/blur.

Vitrine de ranking no login (`LiveRankPanel` / `AUTH_RANK_TABS`): level, classe, moveset, PvP, PvE. O PC da Arena in-game é **só** PvP ranqueado — [ranking.md](ranking.md).

Identidade depois do select: [identidade.md](identidade.md). HUD in-game: [ui-cliente.md](ui-cliente.md).

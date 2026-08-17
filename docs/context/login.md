# Login / auth / char select

Primeira tela da sessão. Sem login estável o resto do MMO não existe.

```text
AuthScreen → JWT / sessão local → CharSelect (hub) → identidade → enter-world
```

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

Identidade depois do select: [identidade.md](identidade.md). HUD in-game: [ui-cliente.md](ui-cliente.md).

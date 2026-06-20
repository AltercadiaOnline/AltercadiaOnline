# Supabase — banco de dados Altercadia

## Aplicar migração

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard) → seu projeto → **SQL Editor**.
2. Execute também:
   - `supabase/migrations/003_auth_user_profile_trigger.sql` — trigger em `auth.users` cria `profiles` automaticamente.
   - `supabase/migrations/004_zero_trust_client_rls.sql` — remove INSERT/UPDATE/DELETE no cliente (apenas SELECT).
   - `supabase/migrations/010_immutable_profile_server_id.sql` — `server_id` imutável após criação do personagem.
   - `supabase/migrations/011_hybrid_character_persistence.sql` — colunas de posição (LOW) e gameplay (HIGH) em `profiles`.
3. Confirme em **Table Editor** que existem as tabelas `profiles`, `inventory` e `currency`.

Ou via script local (requer `DATABASE_URL` em `.env.governance`):

```bash
npm run db:migrate:010
npm run db:migrate:011
```

Alternativa com CLI:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

## Variáveis de ambiente

**Fonte oficial local:** `.env.governance` na raiz (copie de `.env.governance.example`).

Prioridade: variáveis do shell/Vercel → `.env.governance` (Supabase/Postgres) → `.env` (PORT, CORS, etc.).

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-service-role
```

### Camadas (obrigatório)

| Camada | Chaves | Onde |
|--------|--------|------|
| **Cliente (browser)** | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | `GET /config/client` → `initSupabaseAuth()` |
| **Servidor** | `SUPABASE_SERVICE_ROLE_KEY` (+ URL) | `getSupabaseAdminClient()` — nunca expor ao browser |

⚠️ **`.env.governance` JAMAIS pode subir no Git** — está no `.gitignore`. Em produção, use o painel Vercel com os mesmos nomes de variável.

## Tabelas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfil por `user_id` + `character_id` |
| `currency` | Carteira (`dollar_volt`, `alter_coins`) por usuário |
| `inventory` | Pilhas (`stacks` JSONB) e equipamento (`equipped` JSONB) |

## RLS (Zero Trust)

Todas as tabelas têm **Row Level Security** ativo.

| Papel | Permissões |
|-------|------------|
| **Cliente (authenticated JWT)** | `SELECT` apenas — políticas `"Usuários podem ver…"` em `profiles`, `inventory`, `currency` |
| **Servidor (service_role / Vercel)** | INSERT/UPDATE/DELETE — ignora RLS; seed de wallet, inventário, gifts |

O cliente **nunca** grava em Supabase. Perfil via trigger SQL; economia via `seedAuthoritativePlayerEconomyIfEmpty` no servidor.

**Coluna de dono:** em todas as tabelas use `user_id` (não `id`) em `auth.uid() = user_id`. A migração `004` aplica isso explicitamente.

## Bootstrap automático

1. **Novo usuário (auth.users)** — trigger `on_auth_user_created` insere `profiles (user_id, email, character_id=1)`.
2. **Login / snapshot** — servidor `GET /api/player-snapshot` aguarda perfil existir, executa seed autoritativo se necessário e responde `{ ready: true, snapshot }`.
3. **Cliente** — UI só libera após `ready: true`; enquanto aguarda, exibe overlay "Carregando perfil no servidor…".

O servidor (Vercel) é o **único** autorizado a chamar `seedPlayerWalletIfEmpty` / seed de inventário em runtime.

## Gift — transfer_item

Execute `supabase/migrations/002_transfer_item.sql` após a migração 001.

- **RPC** `transfer_item(from, to, itemId, quantity)` — transação atômica (deduz A, adiciona B)
- **HTTP** `POST /api/gift/transfer` — servidor valida JWT e chama RPC com service_role
- **Cliente** `GameStore.sendGift(itemId, targetPlayerId)` via `GiftService`

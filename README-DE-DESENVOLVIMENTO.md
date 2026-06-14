# Altercadia V2 — Guia de desenvolvimento contínuo

Repositório: [AltercadiaOnline/AltercadiaOnline](https://github.com/AltercadiaOnline/AltercadiaOnline)  
Produção: **Vercel** — substitua pela URL do seu projeto (`https://SEU-PROJETO.vercel.app`)

---

## 1. Deploy automático (Git → Vercel)

O fluxo recomendado:

```text
git push origin main  →  GitHub  →  Vercel detecta push  →  novo build
```

### Conferir no painel Vercel (uma vez)

1. [vercel.com/dashboard](https://vercel.com/dashboard) → projeto **AltercadiaOnline**
2. **Settings** → **Git** — repositório `AltercadiaOnline/AltercadiaOnline`, branch **`main`**
3. **Settings** → **Environment Variables** — Supabase + CORS (secção 2)
4. **Deployments** — cada push na `main` gera um novo deploy

### Git local

```bash
git remote -v          # origin → github.com/AltercadiaOnline/AltercadiaOnline.git
git branch -vv         # main rastreia origin/main
git push origin main   # dispara deploy se Vercel estiver ligada ao repo
```

### WebSocket + servidor Node

Este jogo usa **HTTP + WebSocket persistente** (`/ws`). Funções serverless puras da Vercel **não** sustentam esse modelo.

Opções na Vercel:

- **Docker** (`Dockerfile` na raiz) — deploy de container com `node dist/server/index.js`
- **Vercel Fluid / compute long-running** — se disponível no seu plano

O `vercel.json` na raiz define `buildCommand` e `installCommand`; ajuste o tipo de deploy no painel conforme a opção acima.

---

## 2. Variáveis de ambiente (Vercel)

O servidor lê via `loadProjectEnv()` + `loadServerEnv()` (`src/server/config/`):

| Variável | Uso |
|----------|-----|
| `PORT` | `env.port` — Vercel injeta automaticamente |
| `NODE_ENV` | `production` em produção |
| `HOST` | opcional; default `0.0.0.0` |
| `CORS_ORIGIN` | `env.corsOrigins` — HTTP + WebSocket (`/ws`) |
| `TRUST_PROXY` | `true` em produção (proxy Vercel) |
| `SUPABASE_URL` | Auth + API Supabase |
| `SUPABASE_ANON_KEY` | Exposta ao browser via `/config/client` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Só servidor** — nunca no cliente |
| `DATABASE_URL` | Postgres direto (opcional; ver secção 9) |

### Valor recomendado em produção (monólito)

```env
NODE_ENV=production
TRUST_PROXY=true
CORS_ORIGIN=https://SEU-PROJETO.vercel.app
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Sem `https://` ou com URL errada, o WebSocket pode falhar no browser.

---

## 3. Como o front é servido na URL raiz

Fluxo em `src/server/net/staticServer.ts`:

| URL | Origem |
|-----|--------|
| `/` | `public/index.html` |
| `/styles.css` | `public/styles.css` |
| `/client/browser/main.js` | `dist/client/browser/main.js` |
| `/shared/*.js` | `dist/shared/*.js` |
| `/health` | JSON de saúde |
| `/api/player-snapshot` | Snapshot autoritativo (Supabase + seed) |
| `/ws` | WebSocket de combate |

O build (`npm run build`) gera **`dist/`**; **`public/`** é estático. Não é preciso commitar `dist/` no Git.

---

## 4. Checklist antes de cada `git push`

```bash
npm run deploy:check
```

Smoke test local:

```bash
npm start
# http://localhost:3000/health
# http://localhost:3000/
```

### O que **não** commitar

- `node_modules/`, `dist/`, `data/`
- `.env`, `.env.governance` (segredos)

---

## 5. Validar produção após o push

1. `https://SEU-PROJETO.vercel.app/health` → `{"ok":true,"service":"altercadia-v2"}`
2. `https://SEU-PROJETO.vercel.app/` → jogo carrega
3. DevTools → WebSocket `wss://.../ws` conectado
4. Logs Vercel: `CORS origins → ...`

---

## 6. Logs (Vercel)

```bash
npm run vercel:dashboard
```

Ou CLI:

```bash
npm i -g vercel
vercel login
vercel link
vercel logs
```

---

## 7. Scripts úteis

| Script | Quando usar |
|--------|-------------|
| `npm run deploy:check` | Antes de todo push |
| `npm run vercel:dashboard` | Painel Vercel |
| `npm start` | Produção local |
| `npm run dev` | Desenvolvimento com reload |

---

## 8. Problemas comuns

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| WS não conecta | Deploy serverless sem processo persistente | Usar Docker / compute long-running na Vercel |
| CORS / WS bloqueado | `CORS_ORIGIN` incorreto | URL exata `https://...vercel.app` |
| Auth / perfil falha | Supabase env ausente na Vercel | Copiar chaves de `.env.governance.example` |
| DB não configurado | `DATABASE_URL` vazio | Normal se só usa Supabase JS API; ver secção 9 |

---

## 9. Supabase + conexão de banco

**Dois caminhos (independentes da Vercel):**

1. **Supabase HTTP API** (principal) — `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`  
   Usado em: auth JWT, `player-snapshot`, gifts (`transfer_item` RPC), bootstrap de perfil.

2. **Postgres direto** (opcional) — `DATABASE_URL` ou `DATABASE_HOST` + credenciais  
   Lido por `databaseConfig.ts` / `databaseConnection.ts`. Hoje o motor MVP usa JSON em disco (`PERSISTENCE_MODE`); Postgres direto fica pronto para migrações futuras.

Prioridade de env: **shell Vercel** → `.env.governance` (local) → `.env`.

Documentação Supabase: [supabase/README.md](./supabase/README.md)

---

*Stack: TypeScript · Node 20+ · Supabase · Vercel · WebSocket nativo.*

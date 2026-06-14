# Altercadia V2 — Guia de desenvolvimento contínuo

Repositório: [AltercadiaOnline/AltercadiaOnline](https://github.com/AltercadiaOnline/AltercadiaOnline)  
Produção: `https://altercadiaonline-production.up.railway.app`

---

## 1. Deploy automático (Git → Railway)

O **Git local não controla** o deploy da Railway. O fluxo é:

```text
git push origin main  →  GitHub  →  Railway detecta push  →  novo build (Dockerfile)
```

### Conferir no painel Railway (uma vez)

1. Abra o projeto **altercadiaonline-production**.
2. **Settings** → **Source** (ou **GitHub Repo**).
3. Confirme:
   - Repositório: `AltercadiaOnline/AltercadiaOnline`
   - Branch de deploy: **`main`**
   - **Deploy on push** / **Automatic deploys**: **ativado**
4. Em **Deployments**, cada `git push` na `main` deve gerar um novo deploy.

### Git local (já verificado)

```bash
git remote -v          # origin → github.com/AltercadiaOnline/AltercadiaOnline.git
git branch -vv         # main rastreia origin/main
git push origin main   # dispara deploy se Railway estiver ligada ao repo
```

---

## 2. Variáveis de ambiente (Railway)

O servidor lê via `loadServerEnv()` em `src/server/config/env.ts`:

| Variável Railway | Uso no código |
|------------------|---------------|
| `PORT` | `env.port` — Railway injeta automaticamente |
| `NODE_ENV` | `production` recomendado |
| `HOST` | opcional; default `0.0.0.0` |
| `CORS_ORIGIN` | `env.corsOrigins` — HTTP + WebSocket (`/ws`) |

### Valor recomendado em produção (monólito)

```env
NODE_ENV=production
CORS_ORIGIN=https://altercadiaonline-production.up.railway.app
```

Sem `https://` ou com URL errada, o WebSocket pode falhar no browser.

`src/server/index.ts` usa:

- `loadServerEnv()` → `PORT`, `CORS_ORIGIN` / `CORS_ORIGINS`
- `httpServer.listen(env.port, env.host)`
- `createStaticServer({ corsOrigins })` + `CombatWsHub({ corsOrigins })`

---

## 3. Como o front é servido na URL raiz

Fluxo em `src/server/net/staticServer.ts`:

| URL | Origem |
|-----|--------|
| `/` | `public/index.html` |
| `/styles.css` | `public/styles.css` |
| `/client/browser/main.js` | `dist/client/browser/main.js` (gerado pelo `npm run build`) |
| `/shared/*.js` | `dist/shared/*.js` (imports do cliente — obrigatório servir) |
| `/health` | JSON de saúde |
| `/ws` | WebSocket de combate |

O `Dockerfile` na Railway executa `npm run build` e copia **`public/`** + **`dist/`** para a imagem — não é preciso commitar `dist/` no Git.

O `index.html` aponta para:

```html
<script type="module" src="/client/browser/main.js"></script>
```

---

## 4. Checklist antes de cada `git push` (não quebrar produção)

Atalho único (recomendado — espelha o build do Docker na Railway):

```bash
npm run deploy:check
```

Isso executa: `typecheck` → `build`.

Ou passo a passo:

```bash
# 1. Dependências (após pull ou clone)
npm ci

# 2. Tipos
npm run typecheck

# 3. Build (mesmo passo do Docker na Railway)
npm run build

# 4. Smoke test local (opcional mas recomendado)
npm start
# Abra http://localhost:3000/health  → {"ok":true}
# Abra http://localhost:3000/         → jogo + WebSocket
# Ctrl+C para parar
```

### Atalho local (dev)

```bash
npm run mvp          # build + start (igual produção simplificada)
npm run dev:mvp      # build + servidor com reload (tsx watch)
```

### O que **não** commitar

- `node_modules/` — ignorado pelo `.gitignore`
- `dist/` — gerado no build da Railway
- `data/` — snapshots locais
- `.env` com segredos — use só variáveis no painel Railway

### Depois do checklist

```bash
git add .
git commit -m "descricao clara da mudanca"
git push origin main
```

Acompanhe o deploy em **Railway → Deployments** (build Docker + healthcheck `/health`).

---

## 5. Validar produção após o push

1. `https://altercadiaonline-production.up.railway.app/health` → `{"ok":true,"service":"altercadia-v2"}`
2. `https://altercadiaonline-production.up.railway.app/` → HUD de combate
3. DevTools → Network → WebSocket `wss://.../ws` conectado
4. Logs Railway: `CORS origins → https://altercadiaonline-production.up.railway.app`

---

## 6. Logs do Railway (terminal Cursor)

### Abrir painel no navegador (Windows)

```bash
npm run railway:dashboard
```

Depois: projeto **altercadiaonline-production** → serviço → aba **Deployments** → último deploy → **View Logs**.

### CLI Railway (logs no terminal)

Instalação única:

```bash
npm install -g @railway/cli
railway login
```

Na pasta do projeto (após linkar o projeto):

```bash
cd "c:\Users\Usuario\Desktop\MMO BROWSER"
railway link
railway logs --follow
```

Sem CLI, use sempre o dashboard: [railway.com/dashboard](https://railway.com/dashboard).

---

## 7. Scripts úteis (`package.json`)

| Script | Quando usar |
|--------|-------------|
| `npm run deploy:check` | **Antes de todo push** — valida produção (`typecheck` + `build`) |
| `npm run typecheck` | Só tipos |
| `npm run build` | Gera `dist/` (obrigatório localmente para `npm start`) |
| `npm run railway:dashboard` | Abre o painel Railway no browser |
| `npm start` | Produção local (`node dist/server/index.js`) |
| `npm run mvp` | `build` + `start` |
| `npm run dev:mvp` | Desenvolvimento com reload do servidor |

---

## 8. Problemas comuns

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Página em branco / “Conectando” infinito | `dist/shared/*.js` não servidos (404) ou WS bloqueado | `npm run build` + redeploy; `CORS_ORIGIN` com URL exata |
| Página em branco | `dist/` ausente localmente ou build falhou | `npm run build` |
| WS não conecta | `CORS_ORIGIN` incorreto | URL exata com `https://` no Railway |
| 404 em `/client/...` | Build não gerou JS do browser | Verificar `dist/client/browser/main.js` |
| Deploy não inicia | Railway desligada do GitHub | Reconectar repo + branch `main` |

---

*Última revisão alinhada ao commit em `main` com Dockerfile + `staticServer` + `loadServerEnv`.*

# Altercadia V2 — Checklist de desenvolvimento (pré-deploy)

Fluxo oficial: **local (`npm run dev`)** → **validar (`npm run deploy:check`)** → **publicar (`npm run deploy`)** → **Vercel (automático na `main`, se ligado ao GitHub)**.

---

## Pré-deploy (obrigatório antes de `npm run deploy`)

Marque cada item:

- [ ] **Código salvo** — sem arquivos experimentais que não devem ir para produção
- [ ] **`npm run deploy:check`** passou (typecheck + build)
- [ ] **Servidor local** — após `npm run build`, `npm start` ou `npm run dev`:
  - [ ] `http://localhost:3000/health` → `{"ok":true,"service":"altercadia-v2"}`
  - [ ] `http://localhost:3000/` → jogo carrega e WebSocket conecta
- [ ] **Porta** — servidor usa `process.env.PORT` (local: 3000; Vercel: injetada pela plataforma)
- [ ] **Git limpo de conflitos** — `git status` sem conflitos de merge
- [ ] **Branch** — você está em `main` (deploy sempre faz push em `main`)
- [ ] **Mensagem de commit** — defina com `npm run deploy -- "sua mensagem"` se não quiser mensagem automática
- [ ] **Variáveis Vercel** (painel → Project → Settings → Environment Variables):
  - [ ] `NODE_ENV=production`
  - [ ] `CORS_ORIGIN=https://SEU-PROJETO.vercel.app` (URL pública exata)
  - [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (ver `.env.example`)
  - [ ] `DATABASE_URL` (opcional — Postgres direto; Supabase API usa `SUPABASE_*`)

---

## Comandos do dia a dia

| Comando | Função |
|---------|--------|
| `npm run dev` | Build + servidor com reload (teste local completo) |
| `npm run deploy:check` | Validação de build (`typecheck` + `build`) |
| `npm run deploy` | `deploy:check` + `git add` + `commit` + `push origin main` |
| `npm run deploy -- "msg"` | Deploy com mensagem de commit customizada |
| `npm run vercel:dashboard` | Abre painel Vercel (logs e variáveis) |

---

## Git — evitar problemas

```bash
git status
git pull origin main    # antes de trabalhar em outra máquina
```

Se `deploy` falhar no commit:

```bash
git config user.name "Seu Nome"
git config user.email "email-do-github@..."
```

---

## Após o push

1. Aguarde o build na Vercel (Deployments)
2. Teste: `https://SEU-PROJETO.vercel.app/health`
3. Teste: `https://SEU-PROJETO.vercel.app/`
4. Opcional: `npm run vercel:dashboard` → Deployments → logs

---

## Quando NÃO usar `npm run deploy`

- `npm run build` falhou
- Você está em outra branch (crie PR ou mude para `main` antes)
- Secrets/credenciais em arquivos rastreados (nunca commitar `.env` nem `.env.governance`)

---

Documentação estendida: [README-DE-DESENVOLVIMENTO.md](./README-DE-DESENVOLVIMENTO.md)

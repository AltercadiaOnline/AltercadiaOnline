# Altercadia V2 — Checklist de desenvolvimento (pré-deploy)

Fluxo oficial: **local (`npm run dev`)** → **validar (`npm run deploy:check`)** → **publicar (`npm run deploy`)** → **Railway (automático na `main`)**.

---

## Pré-deploy (obrigatório antes de `npm run deploy`)

Marque cada item:

- [ ] **Código salvo** — sem arquivos experimentais que não devem ir para produção
- [ ] **`npm run deploy:check`** passou (typecheck + testes + build)
- [ ] **Servidor local** — após `npm run build`, `npm start` ou `npm run dev`:
  - [ ] `http://localhost:3000/health` → `{"ok":true,"service":"altercadia-v2"}`
  - [ ] `http://localhost:3000/` → jogo carrega e WebSocket conecta
- [ ] **Porta** — servidor usa `process.env.PORT` (local: 3000; Railway: injetada pela plataforma)
- [ ] **Git limpo de conflitos** — `git status` sem conflitos de merge
- [ ] **Branch** — você está em `main` (deploy sempre faz push em `main`)
- [ ] **Mensagem de commit** — defina com `npm run deploy -- "sua mensagem"` se não quiser mensagem automática
- [ ] **Variáveis Railway** (só na primeira vez ou se mudou domínio):
  - [ ] `NODE_ENV=production`
  - [ ] `CORS_ORIGIN=https://altercadiaonline-production.up.railway.app` (URL pública exata)

---

## Comandos do dia a dia

| Comando | Função |
|---------|--------|
| `npm run dev` | Build + servidor com reload (teste local completo) |
| `npm run deploy:check` | Validação igual ao Docker da Railway |
| `npm run deploy` | `deploy:check` + `git add` + `commit` + `push origin main` |
| `npm run deploy -- "msg"` | Deploy com mensagem de commit customizada |
| `npm run railway:dashboard` | Abre painel Railway (só se precisar ver logs) |

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

1. Aguarde 1–3 min (build Docker na Railway)
2. Teste: `https://altercadiaonline-production.up.railway.app/health`
3. Teste: `https://altercadiaonline-production.up.railway.app/`
4. Opcional: `npm run railway:dashboard` → Deployments → logs

---

## Quando NÃO usar `npm run deploy`

- Testes quebrados (`npm test` falhou)
- `npm run build` falhou
- Você está em outra branch (crie PR ou mude para `main` antes)
- Secrets/credenciais em arquivos rastreados (nunca commitar `.env`)

---

Documentação estendida: [README-DE-DESENVOLVIMENTO.md](./README-DE-DESENVOLVIMENTO.md)

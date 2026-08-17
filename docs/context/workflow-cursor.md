# Workflow Cursor — inteligente e econômico

Objetivo: **sequência de jogo**, não “limpar o universo”. Cada chat = **uma fatia**.

## Ritual de 20 segundos (humano)

1. Escolha a ficha em `docs/context/INDEX.md`.
2. Cole o bloco abaixo.
3. Um pedido só (feature **ou** bug **ou** fatia de limpeza — nunca os três).

```text
Módulo: <nome>
Objetivo: <1 frase>
Onde vi: produção Vercel | local
Ficha: @docs/context/<arquivo>.md
Modo: feature | bug | limpeza-fatia
Não explorar o repo. Não abrir PRs/commits sem eu pedir.
```

## O que o agente pode fazer neste chat

| Modo | Limite |
|------|--------|
| **feature / bug** | Diff no módulo da ficha. Sem “já que estou aqui, apago Phaser”. |
| **limpeza-fatia** | Só o alvo da fatia em `limpeza-segura.md`. Grep de import **antes** de apagar. `npm run deploy:check` no fim se tocou build. |
| **proibido** | “Limpa tudo que não está conectado.” “Otimiza o jogo.” “Lê src/ inteiro.” |

## Economia de tokens (o jeito certo)

1. **@ficha**, não @pasta.
2. Não cole GDD + lore + prints de 20 telas.
3. Não fique em Agent com “explique a arquitetura” — isso é Ask + uma ficha.
4. Chat novo **por módulo**. Não empilhar spray + combate + login na mesma memória.
5. Depois de merge: “atualize só `docs/context/<modulo>.md`” — uma linha do que mudou.

## Agent vs Ask

| Precisa mudar código? | Modo |
|------------------------|------|
| Não (entender, planejar fatia) | Ask |
| Sim (1 módulo, arquivos citados) | Agent |

## Commits e deploy

- Commit só se você pedir.
- `npm run deploy` só se você pedir.
- Limpeza **nunca** no mesmo commit de feature de gameplay.

## Sequência saudável de sprints

Jogo primeiro (spray HUD, combate, loja). Limpeza intercalada: **uma fatia por semana**, da lista em `limpeza-segura.md`, não um rewrite.

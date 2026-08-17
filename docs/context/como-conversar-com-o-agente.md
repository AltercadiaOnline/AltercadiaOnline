# Protocolo de chat (economia de memória)

## Frase padrão (copie)

```text
Módulo: <login | spray | combate | combate-pve | combate-pvp | economia | mundo | ui | persistencia | progressao | chat | ranking | minigames | audio>
Objetivo: <1 frase>
Onde vi: <produção Vercel | local>
Ficha: @docs/context/<arquivo>.md
Modo: feature | bug | limpeza-fatia
Não explorar o repo inteiro.
```

Ritual: [workflow-cursor.md](workflow-cursor.md). Faxina: [limpeza-segura.md](limpeza-segura.md) — uma fatia, nunca “apaga o que não está conectado”.

## O que NÃO enviar

- GDD + lore + este índice de uma vez
- `git status` completo de 200 arquivos se o bug é um HUD
- `node_modules`, `dist/`, `data/`, `.env`
- “lê tudo e me fala como está o projeto”

## Tamanho alvo de contexto

Uma ficha (~80 linhas) + arquivos citados nela. Se a tarefa cruzar módulos, mande **duas** fichas, não o mapa de pastas + GDD.

## Depois de um módulo estabilizar

Peça: “atualize só `docs/context/<modulo>.md` com o que mudou”. Não peça para reescrever `docs/` inteiro.

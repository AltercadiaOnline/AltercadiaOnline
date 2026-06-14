# Brief Backend — Minigame Estande de Tiro (Simulador de Refração)

**Versão:** MVP v1.0 · **Escopo:** simples, otimizado, só cidade — **sem combate**

Documento para implementação no servidor. O cliente (outro fluxo) abre HUD após confirmação; este brief cobre **autoridade, economia e validação**.

---

## 1. Objetivo

Permitir que o jogador, na **Cidade 01**, pague uma taxa em **VOLTS**, jogue uma sessão curta de **tiro ao alvo** e receba recompensa simbólica + registro de score. Não altera stats de batalha, marcos, inventário de combate ou `CombatEngine`.

---

## 2. Fluxo autoritativo (MVP)

```text
1. Cliente: REFRACTION_BOOTH_QUOTE     → servidor responde custo + cooldown restante
2. Cliente: REFRACTION_BOOTH_START    → gateway debita entrada → sessionId + seed
3. Cliente: (minigame local ~45s, só UI)
4. Cliente: REFRACTION_BOOTH_COMPLETE → servidor valida → gateway credita prêmio (se houver) → placar local
5. Sessão encerrada (one-shot por sessionId)
```

**Regra:** o servidor **nunca** confia no score bruto do cliente. Recalcula score máximo possível a partir de `hits`, `misses`, `durationMs` e janelas do `seed`.

---

## 3. Economia (obrigatório)

| Momento | Ação |
|---------|------|
| `START` | `economyGateway` — débito ACID da **taxa de entrada** (`REFRACTION_BOOTH_ENTRY_VOLTS`) |
| `COMPLETE` (sucesso) | Crédito opcional de **prêmio** por faixa de score (`REFRACTION_BOOTH_REWARD_TABLE`) |
| Falha / cheat | Sem crédito; entrada **não** reembolsada (MVP) |

- Moeda: **DOLLAR VOLT** (mesmo pipeline de banco/loja).
- **Não** chamar `EconomyManager` / loja interna direto — só gateway + EventBus se o projeto já publicar eventos de transação.

---

## 4. Configuração fixa (MVP — calibrar em um arquivo)

```ts
// Sugestão: src/shared/cityMinigames/refractionBoothConfig.ts

export const REFRACTION_BOOTH_CONFIG = {
  activityId: 'REFRACTION_BOOTH',
  npcId: 'vortex_refraction_instructor', // cliente ancora interação
  entryCostVolts: 25,
  sessionDurationMs: 45_000,        // máximo; complete antes disso
  minCompleteMs: 3_000,             // anti-instant-finish
  maxHitsPerSession: 30,            // teto de alvos válidos
  minMsBetweenHits: 180,            // anti-macro
  cooldownMs: 120_000,              // 2 min entre sessões por personagem
  dailyRewardCapVolts: 150,         // teto de prêmio VOLTS/dia (personagem)
  targetLifetimeMs: 1_200,          // espelha cliente — alvo na tela
  rewardTiers: [
    { minScore: 0,  rewardVolts: 5 },
    { minScore: 10, rewardVolts: 12 },
    { minScore: 20, rewardVolts: 20 },
  ],
  leaderboardMaxEntries: 10,
} as const;
```

**Score sugerido (servidor):** `score = hits * 2 - misses` (clamp 0..maxScore).

**Validação de hit (MVP):** cliente envia apenas `hitIndex` (0..maxHits-1) e `offsetMs` desde `startedAt`. Servidor verifica:

- `offsetMs` dentro de `[hitIndex * spawnInterval, hitIndex * spawnInterval + targetLifetimeMs]`
- `spawnInterval` derivado do `seed` (ex. base 800ms ± jitter pseudoaleatório)
- quantidade de hits ≤ `maxHitsPerSession`
- tempo entre hits ≥ `minMsBetweenHits`

Se validação falhar → `COMPLETE` com `ok: false`, `reason: 'VALIDATION_FAILED'`.

---

## 5. Contrato WebSocket (inbound / outbound)

Prefixo sugerido: mensagens no mesmo canal `/ws` do mundo, parse em `wsProtocol.ts`.

### 5.1 Quote (opcional mas útil)

**Cliente →** `refraction-booth-quote`  
`{ playerId, characterId }`

**Servidor →** `refraction-booth-quote-result`  
```json
{
  "entryCostVolts": 25,
  "cooldownRemainingMs": 0,
  "dailyRewardRemainingVolts": 150,
  "canStart": true,
  "blockReason": null
}
```
`blockReason`: `"COOLDOWN" | "INSUFFICIENT_FUNDS" | "DAILY_CAP"` quando `canStart: false`.

### 5.2 Start

**Cliente →** `refraction-booth-start`  
`{ playerId, characterId, requestId }`

**Servidor →** `refraction-booth-started` (sucesso)  
```json
{
  "sessionId": "uuid",
  "seed": 123456789,
  "startedAt": 1710000000000,
  "expiresAt": 1710000045000,
  "entryChargedVolts": 25
}
```

**Servidor →** `refraction-booth-start-failed`  
`{ requestId, reason: "INSUFFICIENT_FUNDS" | "COOLDOWN" | "SESSION_ACTIVE" }`

### 5.3 Complete

**Cliente →** `refraction-booth-complete`  
```json
{
  "sessionId": "uuid",
  "requestId": "uuid",
  "hits": 18,
  "misses": 4,
  "durationMs": 42000,
  "hitTimings": [{ "hitIndex": 0, "offsetMs": 950 }, ...]
}
```
**MVP:** se `hitTimings` omitido, aceitar só `hits`/`misses`/`durationMs` com validação mais grossa (teto hits, duration, cooldown entre sessões) — preferir timings para anti-cheat leve.

**Servidor →** `refraction-booth-complete-result`  
```json
{
  "ok": true,
  "sessionId": "uuid",
  "score": 32,
  "rewardVolts": 20,
  "walletBalance": 1234,
  "leaderboardRank": 3
}
```

---

## 6. Serviço servidor (estrutura sugerida)

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/shared/cityMinigames/refractionBoothConfig.ts` | Constantes + tipos |
| `src/shared/cityMinigames/refractionBoothTypes.ts` | Payloads WS |
| `src/shared/cityMinigames/validateRefractionBoothSession.ts` | Função pura validação score |
| `src/server/city/RefractionBoothService.ts` | Sessões em memória, cooldown, daily cap |
| `src/server/city/refractionBoothLeaderboard.ts` | Top 10 por `characterId` ou global cidade (MVP: memória + reset semanal opcional) |
| `src/server/net/CombatWsHub.ts` (ou handler mundo) | Rotear 3 mensagens WS |

### Estado em memória (MVP)

```ts
type ActiveSession = {
  sessionId: string;
  playerId: string;
  characterId: number;
  seed: number;
  startedAt: number;
  expiresAt: number;
  completed: boolean;
};
```

- Map `sessionId → ActiveSession`
- Map `characterId → { lastEndedAt, dailyRewardVolts }`
- Limpar sessão após `COMPLETE` ou TTL `expiresAt` (job simples ou checagem lazy)

**Persistência pós-MVP:** cooldown/daily cap no hub do personagem; placar em DB.

---

## 7. O que NÃO fazer (MVP)

- Não usar `CombatEngine`, `CombatSession`, `buildCombatantFromLoadout`.
- Não gravar buff de dash/crit/marcos.
- Não sincronizar outros jogadores vendo o minigame (solo).
- Não reembolsar entrada automaticamente.
- Não implementar ranking global de conta — só placar local da cidade (lista 10 nomes).

---

## 8. EventBus (opcional MVP)

Se quiser crônica / telemetria:

```ts
EventBus.emit({
  type: 'CITY_MINIGAME_COMPLETED',
  payload: { activityId: 'REFRACTION_BOOTH', characterId, score, rewardVolts },
});
```

`WorldLoreLog` pode ignorar no MVP.

---

## 9. Testes mínimos (backend)

1. `START` sem saldo → falha, sem sessão.
2. `START` ok → débito gateway, `sessionId` único.
3. `COMPLETE` com hits impossíveis (hits > max, duration < min) → `ok: false`.
4. `COMPLETE` válido → prêmio na faixa certa, `dailyRewardCap` respeitado.
5. Segundo `START` antes do cooldown → bloqueado.
6. `COMPLETE` duplicado mesmo `sessionId` → idempotente (ignorar ou erro).

---

## 10. Checklist entrega backend

- [ ] Config compartilhada em `shared/cityMinigames/`
- [ ] Validação pura testada (`tsx --test`)
- [ ] Entrada/prêmio só via `economyGateway`
- [ ] 3 rotas WS + tipos em `wsProtocol.ts`
- [ ] Cooldown + cap diário por `characterId`
- [ ] Sessão expira sozinha após `sessionDurationMs`
- [ ] Resposta `complete-result` com saldo atualizado (snapshot wallet)

---

## 11. Contexto cliente (só referência — não implementar no backend)

- NPC na Cidade 01 → diálogo confirmar → `start` → abre painel fullscreen leve (estilo terminal escuro da batalha, **sem** `GameState.BATTLE`).
- Alvo aparece em posição fixa; jogador clica; cliente acumula hits/misses e envia `complete`.
- Fechar painel sempre após `complete-result` ou timeout local.

---

*Altercadia · Minigame cidade · MVP simples*

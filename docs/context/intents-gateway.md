# Intents / Gateway

Toda ação de jogo = **intent** com `intentId` único.

## Fluxo

```text
UI → ActionDispatcher.dispatch(action)
     local/mock: MockEconomyService (mesmo tipo de action)
     online: WS player-intent
Servidor: intentHandlerRegistry → BaseIntentHandler.execute
Resposta: intent-result { intentId, success, data? | error }
Cliente: intentAckClient + PendingIntentRegistry; Zustand só após ACK
```

## Arquivos

| Peça | Path |
|------|------|
| Wire | `src/shared/intent/clientIntent.ts`, `intentProtocol.ts` |
| Cliente | `src/client/ActionDispatcher.ts` |
| Pending/loading | `src/client/sync/pendingIntentRegistry.ts` |
| ACK | `src/client/intent/intentAckClient.ts` |
| Registro | `src/server/handlers/bootstrapHandlers.ts` |
| Base | `src/server/network/BaseIntentHandler.ts` |
| Replay | `src/server/network/intentReplayGuard.ts` |

## Checklist de feature nova

1. Tipo em `ClientAction` (ActionDispatcher).
2. Classe `*Handler` em `src/server/handlers/<domínio>/` + register no bootstrap.
3. Mock: `case` em `MockEconomyService.processAction`.
4. Botão: `ActionGatewayButton` / pending no registry — não flag solta.
5. Economia: só `economyGateway` dentro de transação.

## Exceção documentada

Movimento exploração: fast-lane `MOVE_INTENT` (sem spinner de botão), ainda validado no `GameLoop`.

## Proibido

Mensagem WS ad-hoc sem `intentId`. Confirmar compra/loot/spray só no cliente.

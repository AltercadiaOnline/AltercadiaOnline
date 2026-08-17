# Chat global + privado

Texto no mundo depois do enter-world. Servidor valida e faz fanout; cliente só espelha.

## Arquivos âncora

| Peça | Path |
|------|------|
| Intent global | `CHAT_GLOBAL_SEND` → `src/server/handlers/social/ChatGlobalSendHandler.ts` |
| Intent privado | `CHAT_WHISPER` → `ChatWhisperHandler.ts` — só os dois sockets |
| Broadcast | `src/server/chat/chatGlobalBroadcast.ts` / `chatWhisperDeliver.ts` |
| Moderação server | `src/server/chat/globalChatModeratorServer.ts` (os dois canais) |
| Contrato | `src/shared/world/globalChatTypes.ts` / `src/shared/social/chatWhisperTypes.ts` |
| Shared filtro | `src/shared/chat/globalChatModerator.ts`, `gameBannedWords.ts` |
| Widget | `src/client/app/components/world/hud/WorldGlobalChatWidget.tsx` — abas Global + amigo |
| Lista amigos | `friendListStore.ts` (save) + clique duplo abre aba |
| Controller | `src/client/world/globalChatController.ts` / `whisperChatActions.ts` |

## Regras

- Enviar = intent com `intentId`. Mensagem `chat-global` / `chat-whisper` é o espelho, não a autoridade.
- Precisa de perfil de mundo (personagem no mapa).
- Normalização / palavras banidas no servidor. Cliente não “libera” texto rejeitado.
- Whisper **não** persiste texto. O que sobrevive ao restart é o **nome** na lista de amigos.
- Clique duplo no nome abre aba. Offline = intent falha.
- Pedido de amigo **não** é chat — ver [spray-social.md](spray-social.md).

## Proibido

Emitir `chat-global` ou `chat-whisper` só no cliente. Confirmar envio sem `intent-result`.
Gravar histórico de mensagem privada no save.

/** Mensagem padrão quando o servidor rejeita chat global. */
export const CHAT_GLOBAL_INAPPROPRIATE_MESSAGE = 'Mensagem contém conteúdo inadequado';

export type ChatModerationRejectReason = typeof CHAT_GLOBAL_INAPPROPRIATE_MESSAGE;

export type ChatModerationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: ChatModerationRejectReason };

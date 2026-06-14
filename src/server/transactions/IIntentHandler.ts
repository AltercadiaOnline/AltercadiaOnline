import type { IntentResponse } from '../../shared/intent/intentProtocol.js';

/**
 * Handlers legados (vendor) — retornam IntentResponse; o orquestrador envia o WS.
 * Novos handlers devem estender network/BaseIntentHandler.
 */
export interface ILegacyIntentHandler<TPayload = unknown> {
  readonly actionType: string;
  execute(
    playerId: string,
    characterId: number,
    payload: TPayload,
    intentId: string,
  ): Promise<IntentResponse>;
}

/** @deprecated Use ILegacyIntentHandler ou network/IIntentHandler */
export type IIntentHandler<TPayload = unknown> = ILegacyIntentHandler<TPayload>;

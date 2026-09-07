import type { IntentResult } from '../../shared/intent/intentProtocol.js';
import { withCorrelationId } from '../../shared/sync/pendingActionProtocol.js';
import type { IntentWsSender } from './intentOrchestrator.js';

export type IntentHandlerSession = {
  readonly playerId: string;
  readonly characterId: number;
  readonly sendIntent: IntentWsSender;
  readonly onSuccess?: () => void;
};

/**
 * Contrato dos novos handlers — enviam resposta via sendResponse() (Promise<void>).
 */
export interface IIntentHandler<T = unknown> {
  readonly actionType: string;
  execute(playerId: string, payload: T, intentId: string): Promise<void>;
}

type CapturedIntentSession = {
  readonly characterId: number;
  readonly sendResponse: (
    playerId: string,
    intentId: string,
    success: boolean,
    data?: unknown,
  ) => void;
};

/**
 * Classe base — vincule a sessão com attachSession() antes de execute().
 * Handlers async com `await` devem usar `captureSession()` para não perder o WS
 * se outro intent reutilizar o singleton do handler.
 */
export abstract class BaseIntentHandler<T = unknown> implements IIntentHandler<T> {
  abstract readonly actionType: string;

  protected characterId = 0;

  private wsSender: IntentWsSender | null = null;
  private onSuccess: (() => void) | null = null;

  /** Injeta canal WS + characterId da sessão ativa (ActionDispatcher). */
  attachSession(session: IntentHandlerSession): this {
    this.wsSender = session.sendIntent;
    this.onSuccess = session.onSuccess ?? null;
    this.characterId = session.characterId;
    return this;
  }

  /** @deprecated Use attachSession */
  attachWsSender(sender: IntentWsSender, onSuccess?: () => void): this {
    this.wsSender = sender;
    this.onSuccess = onSuccess ?? null;
    return this;
  }

  abstract execute(playerId: string, payload: T, intentId: string): Promise<void>;

  /**
   * Congela sender/characterId atuais — seguro após `await` em handlers singleton.
   */
  protected captureSession(): CapturedIntentSession {
    const wsSender = this.wsSender;
    const onSuccess = this.onSuccess;
    const characterId = this.characterId;
    return {
      characterId,
      sendResponse: (playerId, intentId, success, data) => {
        this.dispatchResponse(wsSender, onSuccess, playerId, intentId, success, data);
      },
    };
  }

  /**
   * Padroniza intent-result no WebSocket.
   * - success=true  → payload opcional em `data`
   * - success=false → `data` string vira código `error` (ex.: SALDO_INSUFICIENTE)
   */
  protected sendResponse(
    playerId: string,
    intentId: string,
    success: boolean,
    data?: unknown,
  ): void {
    this.dispatchResponse(this.wsSender, this.onSuccess, playerId, intentId, success, data);
  }

  private dispatchResponse(
    wsSender: IntentWsSender | null,
    onSuccess: (() => void) | null,
    playerId: string,
    intentId: string,
    success: boolean,
    data?: unknown,
  ): void {
    if (!wsSender) {
      console.warn('[BaseIntentHandler] WS sender não vinculado', { playerId, intentId, success });
      return;
    }

    const payload: IntentResult = success
      ? withCorrelationId({
          intentId,
          success: true,
          ...(data !== undefined ? { data } : {}),
        })
      : withCorrelationId({
          intentId,
          success: false,
          error: typeof data === 'string' ? data : 'INTENT_REJECTED',
        });

    wsSender({ type: 'intent-result', payload });

    if (success) {
      onSuccess?.();
    }
  }
}

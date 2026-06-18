import type { ClientIntent } from '../../shared/intent/clientIntent.js';
import { isMovePlayerIntentPayload, isRotatePlayerIntentPayload } from '../../shared/world/movementIntent.js';
import type { Player } from '../models/Player.js';
import { bootstrapIntentHandlers } from '../handlers/bootstrapHandlers.js';
import type { MovementIntentHandler } from '../handlers/world/MovementIntentHandler.js';
import { BaseIntentHandler } from './BaseIntentHandler.js';
import { resolveIntentHandler } from './intentHandlerRegistry.js';
import { sendIntentFailure, type IntentWsSender } from './intentOrchestrator.js';

export type ServerIntentContext = {
  readonly connectionId: string;
  readonly playerId: string;
  readonly characterId: number;
  readonly sendIntent: IntentWsSender;
  readonly schedulePersist: () => void;
  readonly movementIntentHandler: MovementIntentHandler;
  readonly getPlayer: (playerId: string, characterId: number) => Player | null;
};

export type DispatchOutcome = 'handled' | 'silent' | 'failed';

/**
 * Cérebro servidor — roteia player-intent para o handler registrado.
 */
export class ActionDispatcher {
  async dispatch(ctx: ServerIntentContext, intent: ClientIntent): Promise<DispatchOutcome> {
    bootstrapIntentHandlers();

    if (intent.type === 'MOVE_INTENT') {
      return this.dispatchMovement(ctx, intent);
    }

    if (intent.type === 'ROTATE_INTENT') {
      return this.dispatchRotate(ctx, intent);
    }

    const handler = resolveIntentHandler(intent.type);
    if (!handler) {
      sendIntentFailure(
        ctx.sendIntent,
        intent.intentId,
        `UNKNOWN_ACTION_TYPE: ${intent.type}`,
      );
      return 'failed';
    }

    if (!(handler instanceof BaseIntentHandler)) {
      sendIntentFailure(
        ctx.sendIntent,
        intent.intentId,
        `HANDLER_MISCONFIGURED: ${intent.type}`,
      );
      return 'failed';
    }

    try {
      handler.attachSession({
        playerId: ctx.playerId,
        characterId: ctx.characterId,
        sendIntent: ctx.sendIntent,
        onSuccess: ctx.schedulePersist,
      });
      await handler.execute(ctx.playerId, intent.payload, intent.intentId);
      return 'handled';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Intenção rejeitada.';
      console.warn('[ActionDispatcher] Handler falhou', {
        intentId: intent.intentId,
        intentType: intent.type,
        playerId: ctx.playerId,
        characterId: ctx.characterId,
        message,
        payload: intent.payload,
      });
      sendIntentFailure(ctx.sendIntent, intent.intentId, message);
      return 'failed';
    }
  }

  private dispatchMovement(ctx: ServerIntentContext, intent: ClientIntent): DispatchOutcome {
    if (!isMovePlayerIntentPayload(intent.payload)) {
      return 'silent';
    }
    const player = ctx.getPlayer(ctx.playerId, ctx.characterId);
    if (!player || !player.isExploring()) {
      return 'silent';
    }
    ctx.movementIntentHandler.enqueue(ctx.connectionId, intent.payload);
    return 'silent';
  }

  private dispatchRotate(ctx: ServerIntentContext, intent: ClientIntent): DispatchOutcome {
    if (!isRotatePlayerIntentPayload(intent.payload)) {
      return 'silent';
    }
    const player = ctx.getPlayer(ctx.playerId, ctx.characterId);
    if (!player || !player.isExploring()) {
      return 'silent';
    }
    ctx.movementIntentHandler.processRotate(
      ctx.playerId,
      ctx.characterId,
      ctx.connectionId,
      intent.payload,
    );
    return 'silent';
  }
}

let dispatcher: ActionDispatcher | null = null;

export function getActionDispatcher(): ActionDispatcher {
  if (!dispatcher) dispatcher = new ActionDispatcher();
  return dispatcher;
}

export function resetActionDispatcher(): void {
  dispatcher = null;
}

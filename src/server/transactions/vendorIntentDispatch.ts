import type {
  GatewayIntentDispatchInput,
  IntentResponse,
} from '../../shared/intent/intentProtocol.js';
import { buildGatewayIntentAction } from '../../shared/intent/intentProtocol.js';
import type { HealAtNpcIntentRequest, HealAtNpcIntentResult } from '../world/NpcHealGateway.js';
import { bootstrapIntentHandlers } from '../handlers/bootstrapHandlers.js';
import { runRegisteredIntentHandler } from './intentOrchestrator.js';

/** @deprecated Use bootstrapIntentHandlers from handlers/bootstrapHandlers.js */
export function bootstrapTransactionHandlers(): void {
  bootstrapIntentHandlers();
}

export async function dispatchTransactionIntent<TPayload = unknown>(
  type: string,
  action: GatewayIntentDispatchInput<TPayload>,
): Promise<IntentResponse> {
  bootstrapIntentHandlers();
  return runRegisteredIntentHandler(type, buildGatewayIntentAction(type, action));
}

export async function handleHealAtNpcIntent(
  request: HealAtNpcIntentRequest,
): Promise<HealAtNpcIntentResult> {
  const result = await dispatchTransactionIntent('HEAL_AT_NPC', {
    playerId: request.playerId,
    characterId: request.characterId,
    intentId: request.intentId,
    payload: {
      npcId: request.npcId,
      ...(request.clientVitals ? { clientVitals: request.clientVitals } : {}),
      ...(request.clientMapId ? { clientMapId: request.clientMapId } : {}),
      ...(request.clientPosition ? { clientPosition: request.clientPosition } : {}),
    },
  });

  if (result.status === 'SUCCESS') return { ok: true };
  return { ok: false, message: result.message ?? 'Falha ao curar no NPC.' };
}

export async function handlePurchaseNpcItemIntent(request: {
  readonly playerId: string;
  readonly characterId: number;
  readonly intentId: string;
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
}): Promise<IntentResponse> {
  return dispatchTransactionIntent('PURCHASE_NPC_ITEM', {
    playerId: request.playerId,
    characterId: request.characterId,
    intentId: request.intentId,
    payload: {
      vendorId: request.vendorId,
      itemId: request.itemId,
      quantity: request.quantity,
    },
  });
}

export async function handleSellNpcItemIntent(request: {
  readonly playerId: string;
  readonly characterId: number;
  readonly intentId: string;
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
}): Promise<IntentResponse> {
  return dispatchTransactionIntent('SELL_NPC_ITEM', {
    playerId: request.playerId,
    characterId: request.characterId,
    intentId: request.intentId,
    payload: {
      vendorId: request.vendorId,
      itemId: request.itemId,
      quantity: request.quantity,
    },
  });
}

export type { HealAtNpcIntentRequest, HealAtNpcIntentResult } from '../world/NpcHealGateway.js';

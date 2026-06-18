import {
  isCombatActionIntentResultData,
  type CombatActionIntentResultData,
} from '../../shared/combat/combatIntentFeedback.js';
import {
  isIntentFailedPayload,
  isIntentResult,
  isIntentSuccessPayload,
  resolveIntentErrorCode,
} from '../../shared/intent/intentProtocol.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import {
  isProjectileCombatAction,
} from '../combat/VfxProjectileManager.js';
import { getVfxProjectileManager } from '../combat/VfxProjectileManager.js';
import { getPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import { notifyActivateBookIntentSuccess } from '../economy/activateBookClient.js';

function tryNotifyActivateBookSuccess(intentId: string, data: unknown): void {
  const pending = getPendingIntentRegistry().get(intentId);
  if (!pending || pending.action.type !== 'ACTIVATE_BOOK') return;
  if (!data || typeof data !== 'object') return;
  const record = data as Record<string, unknown>;
  const bookId = typeof record.bookId === 'string' ? record.bookId : null;
  const expiresAt = typeof record.expiresAt === 'number' ? record.expiresAt : null;
  if (!bookId || expiresAt === null || !Number.isFinite(expiresAt)) return;
  notifyActivateBookIntentSuccess(bookId, expiresAt);
}

async function playCombatAttackVfx(data: CombatActionIntentResultData): Promise<void> {
  if (!isProjectileCombatAction(data.action)) return;
  try {
    await getVfxProjectileManager().playFromGatewayResult(data);
  } catch (error) {
    console.warn('[intentAck] Falha no VFX de projétil:', error);
  }
}

export function handleIntentResultPayload(raw: unknown): void {
  if (!isIntentResult(raw)) return;

  const registry = getPendingIntentRegistry();
  if (!registry.isIntentPending(raw.intentId)) return;

  if (raw.success) {
    tryNotifyActivateBookSuccess(raw.intentId, raw.data);

    if (isCombatActionIntentResultData(raw.data) && isProjectileCombatAction(raw.data.action)) {
      void playCombatAttackVfx(raw.data).finally(() => {
        getActionDispatcher().confirmIntent(raw.intentId);
      });
      return;
    }

    getActionDispatcher().confirmIntent(raw.intentId);
    return;
  }

  getActionDispatcher().rejectIntent(raw.intentId, raw.error ?? 'INTENT_REJECTED');
}

/** @deprecated Compat — converte intent-failed legado para IntentResult. */
export function handleIntentFailedPayload(raw: unknown): void {
  if (isIntentResult(raw)) {
    handleIntentResultPayload(raw);
    return;
  }
  if (!isIntentFailedPayload(raw)) return;

  handleIntentResultPayload({
    intentId: raw.intentId,
    correlationId: raw.intentId,
    success: false,
    error: resolveIntentErrorCode({ message: raw.message }),
  });
}

/** @deprecated Compat — converte intent-success legado para IntentResult. */
export function handleIntentSuccessPayload(raw: unknown): void {
  if (isIntentResult(raw)) {
    handleIntentResultPayload(raw);
    return;
  }
  if (!isIntentSuccessPayload(raw)) return;

  handleIntentResultPayload({
    intentId: raw.intentId,
    correlationId: raw.intentId,
    success: true,
  });
}

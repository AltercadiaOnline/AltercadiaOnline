import { getActionDispatcher } from '../ActionDispatcher.js';
import { getMockEconomyService } from '../economy/economyLayer.js';
import { getPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import { postSystemNotification, showErrorToast } from '../ui/logService.js';

const COLLECT_TIMEOUT_MS = 12_000;
const COLLECT_ERROR_TOAST = 'Falha ao coletar: Servidor offline ou item inválido';

export type BattleLootCollectResult =
  | { readonly ok: true; readonly discardedQuantity?: number }
  | { readonly ok: false };

const pendingCollectByIntentId = new Map<
  string,
  (result: BattleLootCollectResult) => void
>();

function notifyDiscardedLoot(discardedQuantity: number): void {
  if (discardedQuantity <= 0) return;
  postSystemNotification(
    `Inventário cheio: ${discardedQuantity} item(ns) não couberam e foram perdidos.`,
    'high',
  );
}

function reportCollectFailure(error?: unknown): BattleLootCollectResult {
  if (error !== undefined) {
    console.error('[BattleLoot] Falha ao coletar loot:', error);
  }
  showErrorToast(COLLECT_ERROR_TOAST);
  return { ok: false };
}

function resolveDiscardedFromData(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;
  const value = (data as { discardedQuantity?: unknown }).discardedQuantity;
  return typeof value === 'number' ? Math.max(0, Math.floor(value)) : 0;
}

/** Chamado por intentAckClient quando COLLECT_BATTLE_LOOT resolve no online. */
export function notifyBattleLootCollectIntentResult(
  intentId: string,
  success: boolean,
  data?: unknown,
): void {
  const resolve = pendingCollectByIntentId.get(intentId);
  if (!resolve) return;
  pendingCollectByIntentId.delete(intentId);

  if (!success) {
    resolve({ ok: false });
    return;
  }

  const discardedQuantity = resolveDiscardedFromData(data);
  notifyDiscardedLoot(discardedQuantity);
  resolve(discardedQuantity > 0 ? { ok: true, discardedQuantity } : { ok: true });
}

/** @deprecated Compat — loot agora usa ActionDispatcher (player-intent). */
export function configureBattleLootClient(_socket: unknown): void {
  /* no-op — canal dedicado removido */
}

export async function requestBattleLootCollection(
  lootId: string,
  battleId: string,
): Promise<BattleLootCollectResult> {
  try {
    const dispatcher = getActionDispatcher();
    const result = dispatcher.dispatch({
      type: 'COLLECT_BATTLE_LOOT',
      payload: { lootId, battleId },
    });
    if (!result.ok) return reportCollectFailure();
    if (result.status === 'applied') {
      const discardedQuantity = getMockEconomyService()?.consumeLastBattleLootDiscardedQuantity() ?? 0;
      notifyDiscardedLoot(discardedQuantity);
      return discardedQuantity > 0 ? { ok: true, discardedQuantity } : { ok: true };
    }

    const intentId = result.intentId;
    const settled = await new Promise<BattleLootCollectResult>((resolve) => {
      pendingCollectByIntentId.set(intentId, resolve);

      void dispatcher.waitForIntentResult(intentId, COLLECT_TIMEOUT_MS).then((ok) => {
        if (!pendingCollectByIntentId.has(intentId)) return;

        pendingCollectByIntentId.delete(intentId);
        if (!ok) {
          resolve({ ok: false });
          return;
        }

        const discardedQuantity =
          getMockEconomyService()?.consumeLastBattleLootDiscardedQuantity() ?? 0;
        notifyDiscardedLoot(discardedQuantity);
        resolve(discardedQuantity > 0 ? { ok: true, discardedQuantity } : { ok: true });
      });

      window.setTimeout(() => {
        if (!pendingCollectByIntentId.has(intentId)) return;
        pendingCollectByIntentId.delete(intentId);
        if (getPendingIntentRegistry().isIntentPending(intentId)) {
          dispatcher.rejectIntent(intentId, undefined, { silent: true });
        }
        resolve({ ok: false });
      }, COLLECT_TIMEOUT_MS);
    });

    if (!settled.ok) return reportCollectFailure();
    return settled;
  } catch (error) {
    return reportCollectFailure(error);
  }
}

export function dismissBattleLootOnServer(lootId: string): void {
  getActionDispatcher().dispatch({
    type: 'DISMISS_BATTLE_LOOT',
    payload: { lootId },
  });
}

import { getActionDispatcher } from '../ActionDispatcher.js';
import { getMockEconomyService } from '../economy/economyLayer.js';
import { getPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';
import { postSystemNotification, showErrorToast } from '../ui/logService.js';

const COLLECT_TIMEOUT_MS = 12_000;
const COLLECT_ERROR_TOAST = 'Falha ao coletar: Servidor offline ou item inválido';

export type BattleLootCollectResult =
  | { readonly ok: true; readonly discardedQuantity?: number }
  | { readonly ok: false };

let collectTransport: ((payload: { lootId: string; battleId: string }) => void) | null = null;
let dismissTransport: ((lootId: string) => void) | null = null;
const pendingCollectResolvers = new Map<
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

export function configureBattleLootClient(socket: BrowserCombatSocket | null): void {
  if (!socket) {
    collectTransport = null;
    dismissTransport = null;
    return;
  }

  socket.on('loot-collect-result', (raw) => {
    const payload = raw as {
      ok?: boolean;
      lootId?: string;
      partial?: boolean;
      discardedQuantity?: number;
    };
    if (typeof payload?.lootId !== 'string') return;
    const resolver = pendingCollectResolvers.get(payload.lootId);
    if (!resolver) return;
    pendingCollectResolvers.delete(payload.lootId);

    if (!payload.ok) {
      resolver({ ok: false });
      return;
    }

    const discardedQuantity = payload.partial ? (payload.discardedQuantity ?? 0) : 0;
    notifyDiscardedLoot(discardedQuantity);
    resolver({
      ok: true,
      ...(discardedQuantity > 0 ? { discardedQuantity } : {}),
    });
  });

  collectTransport = (payload) => {
    socket.send('combat-confirm-loot', payload);
  };

  dismissTransport = (lootId) => {
    socket.send('combat-dismiss-loot', { lootId });
  };
}

async function collectViaMockDispatcher(lootId: string, battleId: string): Promise<BattleLootCollectResult> {
  const mock = getMockEconomyService();
  const dispatcher = getActionDispatcher();
  const result = dispatcher.dispatch({
    type: 'COLLECT_BATTLE_LOOT',
    payload: { lootId, battleId },
  });
  if (!result.ok) return { ok: false };
  if (result.status === 'applied') {
    const discardedQuantity = mock?.consumeLastBattleLootDiscardedQuantity() ?? 0;
    notifyDiscardedLoot(discardedQuantity);
    return discardedQuantity > 0 ? { ok: true, discardedQuantity } : { ok: true };
  }

  await new Promise((resolve) => window.setTimeout(resolve, 40));
  const stillPending = getPendingIntentRegistry().isIntentPending(result.intentId);
  if (stillPending) return { ok: false };

  const discardedQuantity = mock?.consumeLastBattleLootDiscardedQuantity() ?? 0;
  notifyDiscardedLoot(discardedQuantity);
  return discardedQuantity > 0 ? { ok: true, discardedQuantity } : { ok: true };
}

async function collectViaTransport(lootId: string, battleId: string): Promise<BattleLootCollectResult> {
  return new Promise((resolve, reject) => {
    pendingCollectResolvers.set(lootId, resolve);
    try {
      collectTransport!({ lootId, battleId });
    } catch (error) {
      pendingCollectResolvers.delete(lootId);
      reject(error);
      return;
    }

    window.setTimeout(() => {
      if (!pendingCollectResolvers.has(lootId)) return;
      pendingCollectResolvers.delete(lootId);
      resolve({ ok: false });
    }, COLLECT_TIMEOUT_MS);
  });
}

function reportCollectFailure(error?: unknown): BattleLootCollectResult {
  if (error !== undefined) {
    console.error('[BattleLoot] Falha ao coletar loot:', error);
  }
  showErrorToast(COLLECT_ERROR_TOAST);
  return { ok: false };
}

export async function requestBattleLootCollection(
  lootId: string,
  battleId: string,
): Promise<BattleLootCollectResult> {
  try {
    if (collectTransport) {
      const result = await collectViaTransport(lootId, battleId);
      if (!result.ok) return reportCollectFailure();
      return result;
    }

    const mode = getActionDispatcher().getMode();
    if (mode === 'mock' && getMockEconomyService()) {
      const result = await collectViaMockDispatcher(lootId, battleId);
      if (!result.ok) return reportCollectFailure();
      return result;
    }

    return reportCollectFailure();
  } catch (error) {
    pendingCollectResolvers.delete(lootId);
    return reportCollectFailure(error);
  }
}

export function dismissBattleLootOnServer(lootId: string): void {
  if (dismissTransport) {
    dismissTransport(lootId);
    return;
  }

  if (getActionDispatcher().getMode() !== 'mock' || !getMockEconomyService()) {
    console.warn('[BattleLoot] Dismiss ignorado — aguardando conexão com o servidor.');
    return;
  }

  getActionDispatcher().dispatch({
    type: 'DISMISS_BATTLE_LOOT',
    payload: { lootId },
  });
}

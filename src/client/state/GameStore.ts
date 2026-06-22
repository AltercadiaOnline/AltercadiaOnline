/**
 * FLUXO DE DADOS — GameStore (SSOT do cliente)
 *
 * Services / ActionDispatcher → performServerAction (optimistic + pendingActions + snapshot)
 *   → Servidor / Supabase confirma
 *   → handleServerResponse(success) → commit local
 *   → handleServerResponse(false) → rollback + GameTransactionCoordinator (alerta)
 *
 * UI → subscribeGameStore / gameStoreSelectors (somente leitura reativa)
 * Domain stores (playerItemStore, playerWalletStore) são espelhos internos — UI não acessa.
 */

import type { InventorySnapshot } from '../../shared/character/inventorySlots.js';
import {
  buildInventorySnapshot,
  createEmptyInventorySlots,
} from '../../shared/character/inventorySlots.js';
import type { PlayerItemRecord } from '../../shared/character/itemSlotModel.js';
import { filterEquippedItems } from '../../shared/character/itemSlotModel.js';
import type { BalanceChangedPayload } from '../../shared/economy/events.js';
import { formatAlterCoins, formatVolts } from '../../shared/economy/premiumCurrency.js';
import { resolveTransactionErrorMessage } from '../core/GameTransactionCoordinator.js';
import type { AuthoritativePlayerSnapshot } from '../../shared/playerDataSnapshots.js';
import type { CorrelationId, PendingActionKind } from '../../shared/sync/pendingActionProtocol.js';
import { createCorrelationId } from '../../shared/sync/pendingActionProtocol.js';
import { CombatEventType, type CombatEvent } from '../../shared/events.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { captureClientAuthoritativeSnapshot } from '../sync/captureClientAuthoritativeSnapshot.js';
import { getPlayerItemStore, resetPlayerItemStore } from '../ui/items/playerItemStore.js';
import { getPlayerWalletStore, resetPlayerWalletStore } from '../ui/wallet/playerWalletStore.js';
import { resetPlayerStatsGateway } from '../gateway/PlayerStatsGateway.js';
import { alertSystem } from '../ui/alertSystem.js';

export type GameStoreGold = {
  readonly dollarVolt: number;
  readonly alterCoins: number;
  readonly voltsFormatted: string;
  readonly alterFormatted: string;
};

export type GameStorePlayerState = {
  readonly inventory: InventorySnapshot;
  readonly equipment: readonly PlayerItemRecord[];
  readonly gold: GameStoreGold;
};

export type GameStoreBattleStatus = 'idle' | 'choosing' | 'waiting' | 'resolving' | 'ended';

export type GameStoreBattleState = {
  readonly status: GameStoreBattleStatus;
  readonly phase: string | null;
  readonly timerSeconds: number | null;
  readonly isMyTurn: boolean;
};

export type PendingActionRecord = {
  readonly correlationId: CorrelationId;
  readonly kind: PendingActionKind;
  readonly rollbackSnapshot: AuthoritativePlayerSnapshot;
  readonly createdAtMs: number;
};

export type GameStoreState = {
  readonly authenticated: boolean;
  readonly hydrated: boolean;
  readonly player: GameStorePlayerState;
  readonly battle: GameStoreBattleState;
  readonly pendingActions: Readonly<Record<string, PendingActionRecord>>;
};

export type GameStoreSlice = 'player' | 'battle' | 'pendingActions' | 'auth' | '*';

type GameStoreListener = (state: GameStoreState, slice: GameStoreSlice) => void;

const INITIAL_BATTLE: GameStoreBattleState = {
  status: 'idle',
  phase: null,
  timerSeconds: null,
  isMyTurn: false,
};

/** CorrelationId fixo — consolidação do snapshot autoritativo após world-login / full-state-sync. */
export const SESSION_BOOTSTRAP_CORRELATION_ID = 'session-bootstrap';

const EMPTY_GOLD: GameStoreGold = {
  dollarVolt: 0,
  alterCoins: 0,
  voltsFormatted: formatVolts(0),
  alterFormatted: formatAlterCoins(0),
};

function createEmptyPlayerState(): GameStorePlayerState {
  return {
    inventory: buildInventorySnapshot(createEmptyInventorySlots()),
    equipment: [],
    gold: EMPTY_GOLD,
  };
}

class GameStore {
  private state: GameStoreState = {
    authenticated: false,
    hydrated: false,
    player: createEmptyPlayerState(),
    battle: INITIAL_BATTLE,
    pendingActions: {},
  };

  private readonly listeners = new Set<GameStoreListener>();
  private previousGold: GameStoreGold = EMPTY_GOLD;
  private domainUnsubs: Array<() => void> = [];
  private activeCharacterId: number | null = null;

  /** Pré-auth: store vazio — não espelha domain stores. */
  init(): void {
    this.teardownDomainSubscriptions();
    this.state = {
      authenticated: false,
      hydrated: false,
      player: createEmptyPlayerState(),
      battle: INITIAL_BATTLE,
      pendingActions: {},
    };
    this.previousGold = EMPTY_GOLD;
    this.notify('auth');
  }

  /**
   * Chamado após Supabase (ou dev local) confirmar identidade.
   * Player permanece vazio até bootstrap do servidor.
   */
  activateAfterAuth(): void {
    this.teardownDomainSubscriptions();
    this.state = {
      ...this.state,
      authenticated: true,
      hydrated: false,
      player: createEmptyPlayerState(),
      pendingActions: {},
      battle: INITIAL_BATTLE,
    };
    this.previousGold = EMPTY_GOLD;
    this.activeCharacterId = null;

    this.domainUnsubs.push(
      getPlayerItemStore().subscribe(() => {
        if (this.state.authenticated && this.state.hydrated) {
          this.syncPlayerFromDomain();
        }
      }),
    );

    this.domainUnsubs.push(
      getPlayerWalletStore().subscribe(() => {
        if (this.state.authenticated && this.state.hydrated) {
          this.syncPlayerFromDomain();
        }
      }),
    );

    this.notify('auth');
    this.notify('player');
  }

  /**
   * Injeta estado autoritativo após full-state-sync (socket aberto + world-login).
   * Usa performAction/handleServerResponse para consolidar sem rollback.
   */
  bootstrapFromServerSession(): void {
    if (!this.state.authenticated) return;

    const correlationId = SESSION_BOOTSTRAP_CORRELATION_ID;
    this.clearPendingAction(correlationId);
    this.performServerAction(correlationId, 'player-intent', () => {
      // Domain stores já foram atualizados pelo GlobalStateSynchronizer.
    });
    this.handleServerResponse(correlationId, true, undefined, { silent: true });
    this.markHydrated();
  }

  /** Logout / troca de conta — limpa cache local completamente. */
  resetState(): void {
    this.teardownDomainSubscriptions();
    resetPlayerItemStore();
    resetPlayerWalletStore();
    resetPlayerStatsGateway();

    this.state = {
      authenticated: false,
      hydrated: false,
      player: createEmptyPlayerState(),
      battle: INITIAL_BATTLE,
      pendingActions: {},
    };
    this.previousGold = EMPTY_GOLD;
    this.activeCharacterId = null;
    this.notify('auth');
    this.notify('player');
    this.notify('battle');
    this.notify('pendingActions');
  }

  reset(): void {
    this.resetState();
    this.listeners.clear();
  }

  isAuthenticated(): boolean {
    return this.state.authenticated;
  }

  isHydrated(): boolean {
    return this.state.hydrated;
  }

  setActiveCharacterId(characterId: number): void {
    this.activeCharacterId = characterId;
  }

  getActiveCharacterId(): number | null {
    return this.activeCharacterId;
  }

  /** Marca store hidratado após carga Supabase ou full-state-sync. */
  markHydrated(): void {
    this.state = {
      ...this.state,
      hydrated: true,
    };
    this.syncPlayerFromDomain();
    this.notify('auth');
  }

  getState(): GameStoreState {
    return this.state;
  }

  subscribe(listener: GameStoreListener): () => void;
  subscribe(slice: GameStoreSlice, listener: GameStoreListener): () => void;
  subscribe(
    sliceOrListener: GameStoreSlice | GameStoreListener,
    maybeListener?: GameStoreListener,
  ): () => void {
    const slice: GameStoreSlice =
      typeof sliceOrListener === 'function' ? '*' : sliceOrListener;
    const listener: GameStoreListener =
      typeof sliceOrListener === 'function' ? sliceOrListener : maybeListener!;

    const wrapped: GameStoreListener = (state, changedSlice) => {
      if (slice !== '*' && slice !== changedSlice) return;
      listener(state, changedSlice);
    };

    this.listeners.add(wrapped);
    listener(this.state, slice === '*' ? '*' : slice);
    return () => this.listeners.delete(wrapped);
  }

  syncPlayerFromDomain(): void {
    if (!this.state.authenticated) return;

    const itemSnap = getPlayerItemStore().getSnapshot();
    const gold = this.readGold();
    this.state = {
      ...this.state,
      player: {
        inventory: getPlayerItemStore().getInventorySnapshot(),
        equipment: filterEquippedItems(itemSnap.items),
        gold,
      },
    };
    this.notify('player');
    this.previousGold = gold;
  }

  performAction(
    correlationId: CorrelationId,
    actionFn: () => void,
    rollbackSnapshot?: AuthoritativePlayerSnapshot,
    kind: PendingActionKind = 'player-intent',
  ): void {
    this.performServerAction(correlationId, kind, actionFn, rollbackSnapshot);
  }

  performServerAction(
    correlationId: CorrelationId,
    kind: PendingActionKind,
    actionFn: () => void,
    rollbackSnapshot?: AuthoritativePlayerSnapshot,
  ): void {
    if (!this.state.authenticated) {
      console.warn('[GameStore] performAction ignorado — usuário não autenticado.');
      return;
    }

    const snapshot = rollbackSnapshot ?? captureClientAuthoritativeSnapshot();
    this.state = {
      ...this.state,
      pendingActions: {
        ...this.state.pendingActions,
        [correlationId]: {
          correlationId,
          kind,
          rollbackSnapshot: snapshot,
          createdAtMs: Date.now(),
        },
      },
    };
    this.notify('pendingActions');

    actionFn();
    if (this.state.hydrated) {
      this.syncPlayerFromDomain();
    }
  }

  handleServerResponse(
    correlationId: CorrelationId,
    success: boolean,
    data?: unknown,
    options?: { readonly silent?: boolean },
  ): boolean {
    const entry = this.state.pendingActions[correlationId];
    if (!entry) return false;

    if (success) {
      const { [correlationId]: _removed, ...rest } = this.state.pendingActions;
      this.state = {
        ...this.state,
        pendingActions: rest,
      };
      if (this.state.hydrated) {
        this.syncPlayerFromDomain();
        if (entry.kind === 'player-intent') {
          void this.refreshPlayerStatsAfterEquipSuccess();
        }
      }
      this.notify('pendingActions');
      return true;
    }

    getMutableDataStore().restoreAuthoritativeSnapshot(entry.rollbackSnapshot);
    const { [correlationId]: _removed, ...rest } = this.state.pendingActions;
    this.state = {
      ...this.state,
      pendingActions: rest,
    };
    if (this.state.hydrated) {
      this.syncPlayerFromDomain();
    }
    this.notify('pendingActions');

    const message = resolveTransactionErrorMessage(data, 'Ação rejeitada pelo servidor.');
    if (!options?.silent) {
      alertSystem(message);
    }
    console.warn('[GameStore] Snapshot restaurado após erro', { correlationId });
    return true;
  }

  /**
   * Envia item a outro jogador — sem mutação otimista local.
   * Falha no Postgres/servidor restaura snapshot e mantém inventário original.
   */
  async sendGift(
    itemId: string,
    targetPlayerId: string,
    quantity = 1,
    characterId?: number,
    targetCharacterId?: number,
  ): Promise<{ ok: boolean; message?: string }> {
    if (!this.state.authenticated) {
      const message = 'Sessão não autenticada.';
      alertSystem(message);
      return { ok: false, message };
    }

    const trimmedItem = itemId.trim();
    const trimmedTarget = targetPlayerId.trim();
    if (!trimmedItem || !trimmedTarget) {
      const message = 'Item ou destinatário inválido.';
      alertSystem(message);
      return { ok: false, message };
    }

    const { validateTransferItem } = await import('../../Economy/InventoryService.js');
    const transferPolicy = validateTransferItem(trimmedItem);
    if (!transferPolicy.ok) {
      alertSystem(transferPolicy.reason);
      return { ok: false, message: transferPolicy.reason };
    }

    const resolvedCharacterId = characterId ?? this.activeCharacterId ?? 1;
    const correlationId = createCorrelationId();

    this.performServerAction(correlationId, 'economy-event', () => {});

    const { requestGiftTransfer } = await import('../services/gift/giftTransferClient.js');
    const result = await requestGiftTransfer({
      itemId: trimmedItem,
      targetPlayerId: trimmedTarget,
      quantity,
      characterId: resolvedCharacterId,
      ...(targetCharacterId !== undefined ? { targetCharacterId } : {}),
    });

    if (!result.ok) {
      const message = result.error;
      this.handleServerResponse(correlationId, false, message);
      return { ok: false, message };
    }

    getPlayerItemStore().hydrateFromServerBundle(
      result.senderStacks,
      { equipped: getPlayerItemStore().getEquippedSlots() },
      { immediate: true },
    );
    getMutableDataStore().bumpRevision('inventory');

    this.handleServerResponse(correlationId, true, undefined, { silent: true });
    this.syncPlayerFromDomain();
    return { ok: true };
  }

  updateBattleState(partial: Partial<GameStoreBattleState>): void {
    this.state = {
      ...this.state,
      battle: {
        ...this.state.battle,
        ...partial,
      },
    };
    this.notify('battle');
  }

  hasPendingAction(correlationId: CorrelationId): boolean {
    return correlationId in this.state.pendingActions;
  }

  hasPendingActions(): boolean {
    return Object.keys(this.state.pendingActions).length > 0;
  }

  clearPendingAction(correlationId: CorrelationId): void {
    if (!(correlationId in this.state.pendingActions)) return;
    const { [correlationId]: _removed, ...rest } = this.state.pendingActions;
    this.state = {
      ...this.state,
      pendingActions: rest,
    };
    this.notify('pendingActions');
  }

  clearPendingActions(): void {
    if (Object.keys(this.state.pendingActions).length === 0) return;
    this.state = {
      ...this.state,
      pendingActions: {},
    };
    this.notify('pendingActions');
  }

  resolveFromCombatEvents(events: readonly CombatEvent[]): void {
    for (const event of events) {
      if (event.type === CombatEventType.ACTION_ACCEPTED) {
        this.handleServerResponse(event.payload.requestId, true);
      } else if (event.type === CombatEventType.ACTION_REJECTED) {
        this.handleServerResponse(event.payload.requestId, false, event.payload.reason);
      }
    }
  }

  rejectLatestCombatPending(error?: string, options?: { readonly silent?: boolean }): boolean {
    const latest = Object.values(this.state.pendingActions)
      .filter((entry) => entry.kind === 'combat-command')
      .sort((a, b) => b.createdAtMs - a.createdAtMs)[0];
    if (!latest) return false;
    return this.handleServerResponse(latest.correlationId, false, error, options);
  }

  buildBalanceChangedPayload(): BalanceChangedPayload {
    const gold = this.state.player.gold;
    const previous = this.previousGold;
    return {
      dollarVolt: gold.dollarVolt,
      alterCoins: gold.alterCoins,
      voltsFormatted: gold.voltsFormatted,
      alterFormatted: gold.alterFormatted,
      previousDollarVolt: previous.dollarVolt,
      previousAlterCoins: previous.alterCoins,
      deltaVolts: gold.dollarVolt - previous.dollarVolt,
      deltaAlter: gold.alterCoins - previous.alterCoins,
    };
  }

  private readGold(): GameStoreGold {
    const wallet = getPlayerWalletStore().getSnapshot();
    return {
      dollarVolt: wallet.dollarVolt,
      alterCoins: wallet.alterCoins,
      voltsFormatted: wallet.voltsFormatted,
      alterFormatted: wallet.alterFormatted,
    };
  }

  private teardownDomainSubscriptions(): void {
    this.domainUnsubs.forEach((unsub) => unsub());
    this.domainUnsubs = [];
  }

  private notify(slice: GameStoreSlice): void {
    for (const listener of this.listeners) {
      listener(this.state, slice);
    }
  }

  /** Invalidation pattern — stats recalculados após equip/desequip confirmado pelo servidor. */
  private async refreshPlayerStatsAfterEquipSuccess(): Promise<void> {
    const { getPlayerStatsGateway } = await import('../gateway/PlayerStatsGateway.js');
    const gateway = getPlayerStatsGateway();
    gateway.invalidateCache();
    gateway.refreshFromLocalEquipment();
  }
}

let activeStore: GameStore | null = null;

export function initGameStore(): GameStore {
  if (!activeStore) activeStore = new GameStore();
  activeStore.init();
  return activeStore;
}

export function getGameStore(): GameStore {
  if (!activeStore) activeStore = new GameStore();
  return activeStore;
}

export function activateGameStoreAfterAuth(): void {
  getGameStore().activateAfterAuth();
}

export function resetGameStoreState(): void {
  getGameStore().resetState();
}

export function resetGameStore(): void {
  activeStore?.reset();
  activeStore = null;
}

export function subscribeGameStore(listener: GameStoreListener): () => void;
export function subscribeGameStore(slice: GameStoreSlice, listener: GameStoreListener): () => void;
export function subscribeGameStore(
  sliceOrListener: GameStoreSlice | GameStoreListener,
  maybeListener?: GameStoreListener,
): () => void {
  if (typeof sliceOrListener === 'function') {
    return getGameStore().subscribe(sliceOrListener);
  }
  return getGameStore().subscribe(sliceOrListener, maybeListener!);
}

export async function hydrateGameStoreFromDatabase(
  characterId: number,
  displayName?: string,
): Promise<{ ok: boolean; message?: string }> {
  const { hydrateGameStoreFromSupabase } = await import('./GameStoreSupabaseSync.js');
  const store = getGameStore();
  store.setActiveCharacterId(characterId);
  return hydrateGameStoreFromSupabase(characterId, displayName);
}

export async function persistGameStoreToDatabase(
  characterId?: number,
): Promise<{ ok: boolean; message?: string }> {
  const { persistGameStoreToSupabase } = await import('./GameStoreSupabaseSync.js');
  const resolved = characterId ?? getGameStore().getActiveCharacterId() ?? 1;
  return persistGameStoreToSupabase(resolved);
}

export async function sendGiftViaGameStore(
  itemId: string,
  targetPlayerId: string,
  quantity = 1,
  characterId?: number,
  targetCharacterId?: number,
): Promise<{ ok: boolean; message?: string }> {
  return getGameStore().sendGift(
    itemId,
    targetPlayerId,
    quantity,
    characterId,
    targetCharacterId,
  );
}

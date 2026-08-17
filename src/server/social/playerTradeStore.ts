import { createIntentId } from '../../shared/intent/clientIntent.js';
import {
  PLAYER_TRADE_PENDING_TIMEOUT_MS,
  isWithinPlayerTradeRange,
} from '../../shared/social/playerSocialRange.js';
import {
  TRADE_SLOT_COUNT,
  TradePhase,
  emptyTradeSlots,
  flattenTradeItems,
  type TradeCancelReason,
  type TradeItemOffer,
  type TradeSideSnapshot,
  type TradeSnapshot,
} from '../../shared/social/playerTradeTypes.js';
import { isPlayerInBattle } from '../models/playerSessionRegistry.js';
import { getWorldGameState, type ActivePlayerState } from '../world/WorldGameState.js';
import { getPvpRankedQueueManager } from '../combat/pvp/PvpRankedQueueManager.js';
import { getCasualDuelInviteStore } from './casualDuelInviteStore.js';
import {
  commitAuthoritativePlayerTrade,
  releaseTradeSideReservation,
  replaceTradeSideReservation,
  type TradeSideReservation,
} from '../../Economy/economyGateway.js';

export type TradePeer = {
  readonly connectionId: string;
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
};

type TradeSideRecord = {
  peer: TradePeer;
  slots: (TradeItemOffer | null)[];
  volts: number;
  ready: boolean;
};

type TradeRecord = {
  readonly tradeId: string;
  readonly createdAtMs: number;
  phase: TradePhase;
  from: TradeSideRecord;
  to: TradeSideRecord;
  cancelReason: TradeCancelReason | null;
};

type SnapshotListener = (snapshot: TradeSnapshot, connectionIds: readonly string[]) => void;

function playerKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function reservationOf(side: TradeSideRecord): TradeSideReservation {
  return {
    items: flattenTradeItems(side.slots),
    volts: side.volts,
  };
}

function toSideSnapshot(side: TradeSideRecord): TradeSideSnapshot {
  return {
    playerId: side.peer.playerId,
    characterId: side.peer.characterId,
    displayName: side.peer.displayName,
    slots: side.slots.map((slot) => (slot ? { ...slot } : null)),
    volts: side.volts,
    ready: side.ready,
  };
}

function toSnapshot(record: TradeRecord, phase: TradePhase = record.phase): TradeSnapshot {
  return {
    tradeId: record.tradeId,
    phase,
    from: toSideSnapshot(record.from),
    to: toSideSnapshot(record.to),
    cancelReason: record.cancelReason,
  };
}

function exploringPeer(playerId: string, characterId: number): ActivePlayerState | null {
  const row = getWorldGameState().getByPlayer(playerId, characterId);
  if (!row || row.status !== 'exploring') return null;
  return row;
}

function isRankedBusy(playerId: string, characterId: number): boolean {
  const snapshot = getPvpRankedQueueManager().getSnapshot();
  if (snapshot.phase === 'countdown' || snapshot.phase === 'starting' || snapshot.phase === 'in_battle') {
    return snapshot.slots.some(
      (slot) => slot?.playerId === playerId && slot.characterId === characterId,
    );
  }
  return false;
}

function isSocialBusy(playerId: string, characterId: number): boolean {
  if (isPlayerInBattle(playerId, characterId)) return true;
  if (isRankedBusy(playerId, characterId)) return true;
  return false;
}

export class PlayerTradeStore {
  private readonly trades = new Map<string, TradeRecord>();
  private readonly byPlayerKey = new Map<string, string>();
  private readonly snapshotListeners = new Set<SnapshotListener>();
  private rangeTimer: ReturnType<typeof setInterval> | null = null;

  subscribe(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    this.ensureTimer();
    return () => this.snapshotListeners.delete(listener);
  }

  hasOpenTrade(playerId: string, characterId: number): boolean {
    return this.byPlayerKey.has(playerKey(playerId, characterId));
  }

  createRequest(from: TradePeer, to: TradePeer):
    | { readonly ok: true; readonly snapshot: TradeSnapshot }
    | { readonly ok: false; readonly reason: string } {
    if (from.playerId === to.playerId && from.characterId === to.characterId) {
      return { ok: false, reason: 'Não é possível trocar consigo mesmo.' };
    }
    if (this.byPlayerKey.has(playerKey(from.playerId, from.characterId))) {
      return { ok: false, reason: 'Você já está em um trade.' };
    }
    if (this.byPlayerKey.has(playerKey(to.playerId, to.characterId))) {
      return { ok: false, reason: 'Esse jogador já está em um trade.' };
    }
    if (getCasualDuelInviteStore().hasInvite(from.playerId, from.characterId)
      || getCasualDuelInviteStore().hasInvite(to.playerId, to.characterId)) {
      return { ok: false, reason: 'Não é possível negociar durante um duelo.' };
    }

    const fromWorld = exploringPeer(from.playerId, from.characterId);
    const toWorld = exploringPeer(to.playerId, to.characterId);
    if (!fromWorld) return { ok: false, reason: 'Você precisa estar no mundo para pedir trade.' };
    if (!toWorld) return { ok: false, reason: 'Jogador indisponível ou offline.' };
    if (fromWorld.mapId !== toWorld.mapId) return { ok: false, reason: 'O jogador não está no mesmo mapa.' };
    if (!isWithinPlayerTradeRange(fromWorld.x, fromWorld.y, toWorld.x, toWorld.y)) {
      return { ok: false, reason: 'Chegue mais perto para pedir trade.' };
    }
    if (isSocialBusy(from.playerId, from.characterId)) {
      return { ok: false, reason: 'Você está ocupado.' };
    }
    if (isSocialBusy(to.playerId, to.characterId)) {
      return { ok: false, reason: 'O jogador está ocupado.' };
    }

    const tradeId = createIntentId();
    const record: TradeRecord = {
      tradeId,
      createdAtMs: Date.now(),
      phase: TradePhase.Pending,
      from: { peer: from, slots: emptyTradeSlots(), volts: 0, ready: false },
      to: { peer: to, slots: emptyTradeSlots(), volts: 0, ready: false },
      cancelReason: null,
    };
    this.trades.set(tradeId, record);
    this.byPlayerKey.set(playerKey(from.playerId, from.characterId), tradeId);
    this.byPlayerKey.set(playerKey(to.playerId, to.characterId), tradeId);
    this.ensureTimer();
    const snapshot = toSnapshot(record);
    this.emit(snapshot, record);
    return { ok: true, snapshot };
  }

  async respond(
    actorPlayerId: string,
    actorCharacterId: number,
    tradeId: string,
    accept: boolean,
  ): Promise<
    | { readonly ok: true; readonly snapshot: TradeSnapshot }
    | { readonly ok: false; readonly reason: string }
  > {
    const record = this.trades.get(tradeId);
    if (!record || record.phase !== TradePhase.Pending) {
      return { ok: false, reason: 'Pedido de trade expirado ou inválido.' };
    }
    const isTarget =
      record.to.peer.playerId === actorPlayerId && record.to.peer.characterId === actorCharacterId;
    if (!isTarget) {
      return { ok: false, reason: 'Este pedido não é seu.' };
    }
    if (!accept) {
      return { ok: true, snapshot: await this.cancel(record, 'refused') };
    }

    const fromWorld = exploringPeer(record.from.peer.playerId, record.from.peer.characterId);
    const toWorld = exploringPeer(record.to.peer.playerId, record.to.peer.characterId);
    if (!fromWorld || !toWorld) {
      return { ok: true, snapshot: await this.cancel(record, 'offline') };
    }
    if (fromWorld.mapId !== toWorld.mapId) {
      return { ok: true, snapshot: await this.cancel(record, 'map') };
    }
    if (!isWithinPlayerTradeRange(fromWorld.x, fromWorld.y, toWorld.x, toWorld.y)) {
      return { ok: true, snapshot: await this.cancel(record, 'range') };
    }
    if (isSocialBusy(record.from.peer.playerId, record.from.peer.characterId)
      || isSocialBusy(record.to.peer.playerId, record.to.peer.characterId)) {
      return { ok: true, snapshot: await this.cancel(record, 'busy') };
    }

    record.phase = TradePhase.Open;
    const snapshot = toSnapshot(record);
    this.emit(snapshot, record);
    return { ok: true, snapshot };
  }

  async setOffer(
    actorPlayerId: string,
    actorCharacterId: number,
    tradeId: string,
    next: {
      readonly slotIndex?: number;
      readonly itemId?: string | null;
      readonly quantity?: number;
      readonly volts?: number;
    },
  ): Promise<
    | { readonly ok: true; readonly snapshot: TradeSnapshot }
    | { readonly ok: false; readonly reason: string }
  > {
    const record = this.trades.get(tradeId);
    if (!record || record.phase !== TradePhase.Open) {
      return { ok: false, reason: 'Mesa de trade indisponível.' };
    }
    const side = this.actorSide(record, actorPlayerId, actorCharacterId);
    if (!side) return { ok: false, reason: 'Esta mesa não é sua.' };

    const previous = reservationOf(side);
    const nextSlots = side.slots.map((slot) => (slot ? { ...slot } : null));
    let nextVolts = side.volts;

    if (next.volts !== undefined) {
      const volts = Math.max(0, Math.floor(next.volts));
      nextVolts = volts;
    }

    if (next.slotIndex !== undefined) {
      const slotIndex = Math.floor(next.slotIndex);
      if (slotIndex < 0 || slotIndex >= TRADE_SLOT_COUNT) {
        return { ok: false, reason: 'Slot de trade inválido.' };
      }
      const itemId = typeof next.itemId === 'string' ? next.itemId.trim() : '';
      const quantity = Math.max(0, Math.floor(next.quantity ?? 0));
      if (!itemId || quantity <= 0) {
        nextSlots[slotIndex] = null;
      } else {
        nextSlots[slotIndex] = { itemId, quantity };
      }
    }

    const nextReservation: TradeSideReservation = {
      items: flattenTradeItems(nextSlots),
      volts: nextVolts,
    };
    const reserved = await replaceTradeSideReservation(
      side.peer.playerId,
      side.peer.characterId,
      previous,
      nextReservation,
    );
    if (!reserved.ok) return { ok: false, reason: reserved.message };

    side.slots = nextSlots;
    side.volts = nextVolts;
    record.from.ready = false;
    record.to.ready = false;
    const snapshot = toSnapshot(record);
    this.emit(snapshot, record);
    return { ok: true, snapshot };
  }

  async setReady(
    actorPlayerId: string,
    actorCharacterId: number,
    tradeId: string,
    ready: boolean,
  ): Promise<
    | { readonly ok: true; readonly snapshot: TradeSnapshot }
    | { readonly ok: false; readonly reason: string }
  > {
    const record = this.trades.get(tradeId);
    if (!record || record.phase !== TradePhase.Open) {
      return { ok: false, reason: 'Mesa de trade indisponível.' };
    }
    const side = this.actorSide(record, actorPlayerId, actorCharacterId);
    if (!side) return { ok: false, reason: 'Esta mesa não é sua.' };

    side.ready = ready === true;
    if (!record.from.ready || !record.to.ready) {
      const snapshot = toSnapshot(record);
      this.emit(snapshot, record);
      return { ok: true, snapshot };
    }

    record.phase = TradePhase.Committing;
    this.emit(toSnapshot(record), record);

    const committed = await commitAuthoritativePlayerTrade({
      partyA: {
        playerId: record.from.peer.playerId,
        characterId: record.from.peer.characterId,
      },
      partyB: {
        playerId: record.to.peer.playerId,
        characterId: record.to.peer.characterId,
      },
      offerA: reservationOf(record.from),
      offerB: reservationOf(record.to),
    });

    if (!committed.ok) {
      record.phase = TradePhase.Open;
      record.from.ready = false;
      record.to.ready = false;
      const snapshot = toSnapshot(record);
      this.emit(snapshot, record);
      return { ok: false, reason: committed.message };
    }

    record.phase = TradePhase.Committed;
    const snapshot = toSnapshot(record);
    this.emit(snapshot, record);
    this.drop(record);
    return { ok: true, snapshot };
  }

  async cancelByActor(
    actorPlayerId: string,
    actorCharacterId: number,
    tradeId: string,
  ): Promise<
    | { readonly ok: true; readonly snapshot: TradeSnapshot }
    | { readonly ok: false; readonly reason: string }
  > {
    const record = this.trades.get(tradeId);
    if (!record || record.phase === TradePhase.Committing || record.phase === TradePhase.Committed) {
      return { ok: false, reason: 'Não é possível cancelar agora.' };
    }
    if (!this.actorSide(record, actorPlayerId, actorCharacterId)) {
      return { ok: false, reason: 'Esta mesa não é sua.' };
    }
    return { ok: true, snapshot: await this.cancel(record, 'cancelled') };
  }

  onDisconnect(connectionId: string): void {
    for (const record of [...this.trades.values()]) {
      if (record.from.peer.connectionId === connectionId || record.to.peer.connectionId === connectionId) {
        void this.cancel(record, 'offline');
      }
    }
  }

  private actorSide(record: TradeRecord, playerId: string, characterId: number): TradeSideRecord | null {
    if (record.from.peer.playerId === playerId && record.from.peer.characterId === characterId) {
      return record.from;
    }
    if (record.to.peer.playerId === playerId && record.to.peer.characterId === characterId) {
      return record.to;
    }
    return null;
  }

  private async cancel(record: TradeRecord, reason: TradeCancelReason): Promise<TradeSnapshot> {
    if (record.phase === TradePhase.Open || record.phase === TradePhase.Pending) {
      await releaseTradeSideReservation(
        record.from.peer.playerId,
        record.from.peer.characterId,
        reservationOf(record.from),
      );
      await releaseTradeSideReservation(
        record.to.peer.playerId,
        record.to.peer.characterId,
        reservationOf(record.to),
      );
    }
    record.phase = TradePhase.Cancelled;
    record.cancelReason = reason;
    const snapshot = toSnapshot(record);
    this.emit(snapshot, record);
    this.drop(record);
    return snapshot;
  }

  private tick(): void {
    const now = Date.now();
    for (const record of [...this.trades.values()]) {
      if (record.phase === TradePhase.Committing || record.phase === TradePhase.Committed) continue;

      if (record.phase === TradePhase.Pending && now - record.createdAtMs >= PLAYER_TRADE_PENDING_TIMEOUT_MS) {
        void this.cancel(record, 'timeout');
        continue;
      }

      const fromWorld = exploringPeer(record.from.peer.playerId, record.from.peer.characterId);
      const toWorld = exploringPeer(record.to.peer.playerId, record.to.peer.characterId);
      if (!fromWorld || !toWorld) {
        void this.cancel(record, 'offline');
        continue;
      }
      if (fromWorld.mapId !== toWorld.mapId) {
        void this.cancel(record, 'map');
        continue;
      }
      if (!isWithinPlayerTradeRange(fromWorld.x, fromWorld.y, toWorld.x, toWorld.y)) {
        void this.cancel(record, 'range');
        continue;
      }
      if (isPlayerInBattle(record.from.peer.playerId, record.from.peer.characterId)
        || isPlayerInBattle(record.to.peer.playerId, record.to.peer.characterId)) {
        void this.cancel(record, 'combat');
      }
    }

    if (this.trades.size === 0) {
      this.clearTimer();
    }
  }

  private drop(record: TradeRecord): void {
    this.trades.delete(record.tradeId);
    this.byPlayerKey.delete(playerKey(record.from.peer.playerId, record.from.peer.characterId));
    this.byPlayerKey.delete(playerKey(record.to.peer.playerId, record.to.peer.characterId));
  }

  private emit(snapshot: TradeSnapshot, record: TradeRecord): void {
    const connectionIds = [record.from.peer.connectionId, record.to.peer.connectionId];
    for (const listener of this.snapshotListeners) {
      listener(snapshot, connectionIds);
    }
  }

  private ensureTimer(): void {
    if (this.rangeTimer !== null) return;
    this.rangeTimer = setInterval(() => this.tick(), 200);
  }

  private clearTimer(): void {
    if (this.rangeTimer === null) return;
    clearInterval(this.rangeTimer);
    this.rangeTimer = null;
  }
}

let store: PlayerTradeStore | null = null;

export function getPlayerTradeStore(): PlayerTradeStore {
  store ??= new PlayerTradeStore();
  return store;
}

export function resetPlayerTradeStoreForTests(): void {
  store = null;
}
